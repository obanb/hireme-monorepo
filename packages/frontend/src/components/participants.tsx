import Image from "next/image";

interface Participant {
    role: string;
    name: string;
    avatar: string; // Imported image object (static import)
    description: string;
    status: string;
}

interface Props {
    participants: Participant[];
}

export default function ParticipantsSidebar({ participants }: Props) {
    return (
        <div className="w-full space-y-4 overflow-y-auto box-border pr-1">
            {participants.map((p) => (
                <div
                    key={p.role}
                    className="bg-white rounded-xl shadow p-4 flex items-center gap-4 border box-border w-full relative"
                >
                    <div className="relative w-12 h-12 shrink-0">
                        <Image
                            src={p.avatar}
                            alt={p.name}
                            fill
                            className="rounded-full object-cover"
                            sizes="48px"
                            priority
                        />
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                        <div className="text-sm text-gray-500 truncate">{p.description}</div>
                        <div className="text-xs text-blue-500 mt-1 truncate">{p.role}</div>
                        {p.status && (
                            <div className="text-xs mt-1 text-green-600 italic truncate">{p.status}</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}