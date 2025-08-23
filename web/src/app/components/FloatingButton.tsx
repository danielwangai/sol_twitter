"use client";

export default function FloatingButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition transform hover:scale-105"
            onClick={onClick}
        >
            ➕
        </button>
    );
}
