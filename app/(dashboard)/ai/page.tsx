import { useTranslation } from "react-i18next";
import { useAiChat } from "../overview/useAiChat";
import { AiChatUI } from "@/components/AiChatUI";

export default function AiPage() {
  const { t } = useTranslation();
  const chat = useAiChat();

  return (
    <div className="flex flex-col h-[calc(100dvh-48px-48px)] -mt-4 -mx-4 sm:-mx-8">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">{t("overview.aiAgent.heading")}</h2>
      </div>

      {/* Chat content */}
      <div className="flex-1 min-h-0">
        <AiChatUI
          messages={chat.messages}
          input={chat.input}
          setInput={chat.setInput}
          isStreaming={chat.isStreaming}
          error={chat.error}
          status={chat.status}
          messagesEndRef={chat.messagesEndRef}
          inputRef={chat.inputRef}
          handleSubmit={chat.handleSubmit}
          onClear={chat.clearMessages}
        />
      </div>
    </div>
  );
}
