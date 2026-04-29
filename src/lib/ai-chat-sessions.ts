export interface AiChatMessage {
  role: string;
  content: string;
}

export interface AiChatSession {
  id: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const makeTitle = (messages: AiChatMessage[]) => {
  const firstUser = messages.find((message) => message.role === "user")?.content.trim();
  if (!firstUser) return "New chat";
  return firstUser.length > 34 ? `${firstUser.slice(0, 34)}…` : firstUser;
};

export const loadAiChatSessions = (sessionsKey: string, legacyKey: string): AiChatSession[] => {
  try {
    const saved = localStorage.getItem(sessionsKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      const messages = JSON.parse(legacy) as AiChatMessage[];
      if (Array.isArray(messages) && messages.length > 0) {
        return [{
          id: Date.now().toString(),
          title: makeTitle(messages),
          messages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      }
    }
  } catch {
    return [];
  }
  return [];
};

export const saveAiChatSessions = (sessionsKey: string, sessions: AiChatSession[]) => {
  localStorage.setItem(sessionsKey, JSON.stringify(sessions.slice(0, 20)));
};

export const upsertAiChatSession = (
  sessions: AiChatSession[],
  sessionId: string,
  messages: AiChatMessage[],
): AiChatSession[] => {
  const now = new Date().toISOString();
  const existing = sessions.find((session) => session.id === sessionId);
  const updated: AiChatSession = {
    id: sessionId,
    title: existing?.title && existing.title !== "New chat" ? existing.title : makeTitle(messages),
    messages,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return [updated, ...sessions.filter((session) => session.id !== sessionId)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20);
};