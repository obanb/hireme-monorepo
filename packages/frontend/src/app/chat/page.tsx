// app/chat/page.tsx
import Chat from "../../components/chat";
import ParticipantsSidebar from "../../components/participants";


const participants = [
    {
        role: "Interviewer",
        name: "Jane Doe",
        avatar: "/images/girl1.png", // relative to public/
        description: "Senior Frontend Engineer",
        status: "online",
    },
    {
        role: "Candidate",
        name: "John Smith",
        avatar: "/images/man1.png",
        description: "Frontend Developer Applicant",
        status: "online",
    },
];

export default function ChatPage() {
    return (
        <main className="flex justify-center items-start min-h-screen bg-gray-100 py-10 px-4">
            <div className="flex w-full max-w-6xl bg-white rounded-xl shadow border overflow-hidden box-border">
                <div className="flex-1 p-6 box-border">
                    <Chat />
                </div>
                <div className="w-80 border-l border-gray-200 p-4 bg-white hidden md:block box-border">
                    <ParticipantsSidebar participants={participants} />
                </div>
            </div>
        </main>
    );
}
