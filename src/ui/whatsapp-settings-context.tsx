import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type WhatsAppSettingsContextType = {
  defaultMessageEnabled: boolean;
  setDefaultMessageEnabled: (enabled: boolean) => Promise<void>;
  coachName: string;
  setCoachName: (name: string) => Promise<void>;
  groupInviteLinks: Record<string, string>;
  setGroupInviteLink: (classId: string, link: string) => Promise<void>;
  loading: boolean;
};

const WhatsAppSettingsContext = createContext<WhatsAppSettingsContextType | undefined>(undefined);

const STORAGE_KEY_DEFAULT_MESSAGE = "whatsapp_default_message_enabled";
const STORAGE_KEY_COACH_NAME = "whatsapp_coach_name";
const STORAGE_KEY_GROUP_LINKS = "whatsapp_group_links";

export function WhatsAppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [defaultMessageEnabled, setDefaultMessageEnabledState] = useState(true);
  const [coachName, setCoachNameState] = useState("Gustavo");
  const [groupInviteLinks, setGroupInviteLinksState] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Carregar preferências salvas
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedDefaultMessage = await AsyncStorage.getItem(STORAGE_KEY_DEFAULT_MESSAGE);
        const savedCoachName = await AsyncStorage.getItem(STORAGE_KEY_COACH_NAME);
        const savedGroupLinks = await AsyncStorage.getItem(STORAGE_KEY_GROUP_LINKS);

        if (savedDefaultMessage !== null) {
          setDefaultMessageEnabledState(savedDefaultMessage === "true");
        }
        if (savedCoachName !== null) {
          setCoachNameState(savedCoachName);
        }
        if (savedGroupLinks !== null) {
          setGroupInviteLinksState(JSON.parse(savedGroupLinks));
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de WhatsApp:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const setDefaultMessageEnabled = async (enabled: boolean) => {
    setDefaultMessageEnabledState(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_MESSAGE, String(enabled));
    } catch (err) {
      console.error("Erro ao salvar configurações de WhatsApp:", err);
    }
  };

  const setCoachName = async (name: string) => {
    setCoachNameState(name);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_COACH_NAME, name);
    } catch (err) {
      console.error("Erro ao salvar nome do treinador:", err);
    }
  };

  const setGroupInviteLink = async (classId: string, link: string) => {
    const updated = { ...groupInviteLinks, [classId]: link };
    setGroupInviteLinksState(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_GROUP_LINKS, JSON.stringify(updated));
    } catch (err) {
      console.error("Erro ao salvar link do grupo:", err);
    }
  };

  return (
    <WhatsAppSettingsContext.Provider
      value={{ 
        defaultMessageEnabled, 
        setDefaultMessageEnabled, 
        coachName, 
        setCoachName, 
        groupInviteLinks, 
        setGroupInviteLink, 
        loading 
      }}
    >
      {children}
    </WhatsAppSettingsContext.Provider>
  );
}

export function useWhatsAppSettings() {
  const context = useContext(WhatsAppSettingsContext);
  if (context === undefined) {
    throw new Error("useWhatsAppSettings must be used within WhatsAppSettingsProvider");
  }
  return context;
}
