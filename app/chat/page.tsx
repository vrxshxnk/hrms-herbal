"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelList,
  Window,
  ChannelHeader,
  MessageList,
  MessageComposer,
  useChatContext,
} from "stream-chat-react";
import { Search, Plus, Phone, Video, MoreVertical, Menu, X } from "lucide-react";

import "stream-chat-react/dist/css/index.css";
import "./stream-theme.css";
import { useAuth } from "../context/AuthContext";

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY!;

type Employee = {
  id: string;
  keycloakId: string;
  first_name: string;
  work_email?: string;
};

function NewConversationPanel() {
  const { client, setActiveChannel } = useChatContext();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/directory", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const mapped: Employee[] = (json.data?.data ?? []).map((e: any) => ({
        id: e.id,
        keycloakId: e.keycloakId ?? e.keycloak_id,
        first_name: e.displayName ?? e.display_name ?? e.first_name,
        work_email: e.work_email,
      }));
      setEmployees(mapped);
    } catch (err) {
      console.error("failed to load employees", err);
    } finally {
      setLoading(false);
    }
  }

  async function startConversation(employee: Employee) {
    if (!client) return;
    if (!employee.keycloakId) {
      console.error("Employee has no linked keycloak_id, cannot start chat", employee);
      return;
    }
    setStarting(employee.keycloakId);
    try {
      const res = await fetch("/api/v1/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: employee.keycloakId,
          targetName: employee.first_name,
          targetEmail: employee.work_email,
        }),
      });
      const json = await res.json();
      const { channelId, channelType } = json.data;

      const channel = client.channel(channelType, channelId);
      await channel.watch();
      setActiveChannel(channel);
      setOpen(false);
    } catch (err) {
      console.error("failed to start conversation", err);
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="relative px-3 py-2">
      <button
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) loadEmployees();
        }}
      >
        <Plus size={18} />
        New Conversation
      </button>

      {open && (
        <div className="mt-2 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl z-20 relative">
          {loading && (
            <div className="p-3 text-xs text-slate-400 font-medium text-center">Loading employees...</div>
          )}
          {!loading && employees.length === 0 && (
            <div className="p-3 text-xs text-slate-400 font-medium text-center">No employees found</div>
          )}
          {employees.map((emp) => (
            <button
              key={emp.id}
              disabled={starting === emp.keycloakId || !emp.keycloakId}
              onClick={() => startConversation(emp)}
              className="w-full flex items-center gap-3 text-left px-3 py-2.5 text-xs hover:bg-slate-50 disabled:opacity-50 border-b border-slate-50 last:border-0 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                {(emp.first_name || emp.work_email || "?").charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate font-medium text-slate-700">
                {starting === emp.keycloakId ? "Starting..." : emp.first_name || emp.work_email || emp.id}
              </span>
              {!emp.keycloakId && (
                <span className="text-[10px] text-slate-400 shrink-0">not linked</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    let chatClient: StreamChat;
    let cancelled = false;

    async function initChat() {
      const res = await fetch("/api/v1/chat-token", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res_json = await res.json();
      const { token: chatToken, userId, email } = res_json.data;

      if (!chatToken || cancelled) return;

      chatClient = StreamChat.getInstance(apiKey);

      if (chatClient.userID) {
        setClient(chatClient);
        return;
      }

      await chatClient.connectUser(
        { id: userId, name: email || userId },
        chatToken,
      );

      if (!cancelled) setClient(chatClient);
    }

    initChat();

    return () => {
      cancelled = true;
      if (chatClient) chatClient.disconnectUser();
    };
  }, [token]);

  if (!client) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center text-slate-400 font-medium">
        Loading HRMS Chat...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] p-2 md:p-4 bg-slate-50/60 flex flex-col">
      <div className="flex-1 max-w-[1600px] w-full mx-auto bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex relative">
        <Chat client={client} theme="messaging light">
          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="md:hidden absolute top-3 left-3 z-30 p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            {showMobileSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Sidebar Drawer */}
          <div
            className={`w-80 flex flex-col border-r border-slate-100 bg-white absolute md:relative z-20 h-full transition-transform duration-300 ${
              showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
          >
            {/* Search Box */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-full bg-slate-100/70 border-none text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  disabled
                />
              </div>
            </div>

            <NewConversationPanel />

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              <ChannelList
                filters={{ type: "messaging", members: { $in: [client.userID!] } }}
                sort={{ last_message_at: -1 }}
              />
            </div>
          </div>

          {/* Active Chat Area */}
          <div className="flex-1 flex flex-col h-full bg-[#f3f6fc] min-w-0">
            <Channel>
              <Window>
                <div className="bg-white border-b border-slate-100 flex items-center justify-between px-4 py-2.5 shadow-2xs">
                  <div className="flex-1 pl-10 md:pl-0">
                    <ChannelHeader />
                  </div>
                  {/* Decorative Action Controls (from reference UI) */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0 ml-2">
                    <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <Video size={18} />
                    </button>
                    <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <MessageList />
                </div>

                <div className="p-3 bg-white border-t border-slate-100">
                  <MessageComposer />
                </div>
              </Window>
            </Channel>
          </div>
        </Chat>
      </div>
    </div>
  );
}