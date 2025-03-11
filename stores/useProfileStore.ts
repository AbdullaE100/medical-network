import { create } from 'zustand';
import { Profile, ProfileSettings } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

interface ProfileState {
  profile: Profile | null;
  settings: ProfileSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<boolean>;
  updateSettings: (data: Partial<ProfileSettings>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  settings: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profile) {
        set({ profile });
      }

      const { data: settings, error: settingsError } = await supabase
        .from('profile_settings')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settings) {
        set({ settings });
      }

    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Partial<Profile>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Handle avatar upload if present
      if (data.avatar_url && (data.avatar_url.startsWith('file://') || data.avatar_url.startsWith('ph://'))) {
        const timestamp = Date.now();
        const fileExt = 'jpg';
        const fileName = `${user.id}_${timestamp}.${fileExt}`;
        const filePath = `${fileName}`;

        // Convert URI to Blob for web compatibility
        const response = await fetch(data.avatar_url);
        const blob = await response.blob();

        // Upload the file
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update the avatar_url with the public URL
        data.avatar_url = publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        profile: state.profile ? { ...state.profile, ...data } : null
      }));
      
      return true;
    } catch (error) {
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (data: Partial<ProfileSettings>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile_settings')
        .upsert({
          profile_id: user.id,
          ...data,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      set((state) => ({
        settings: state.settings ? { ...state.settings, ...data } : null
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },
}));