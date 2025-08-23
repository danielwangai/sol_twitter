
export default function Sidebar() {
    return (
        <aside className="w-64 border-r border-gray-200 min-h-screen px-4 py-6 hidden md:block">
            <nav className="space-y-4">
                <a href="#"
                   className="flex items-center space-x-2 text-lg font-semibold text-gray-800 hover:text-indigo-600">
                    <span>🏠</span>
                    <span>Home</span>
                </a>
                <a href="#"
                   className="flex items-center space-x-2 text-lg font-semibold text-gray-800 hover:text-indigo-600">
                    <span>🔍</span>
                    <span>Explore</span>
                </a>
                <a href="#"
                   className="flex items-center space-x-2 text-lg font-semibold text-gray-800 hover:text-indigo-600">
                    <span>🔔</span>
                    <span>Notifications</span>
                </a>
                <a href="#"
                   className="flex items-center space-x-2 text-lg font-semibold text-gray-800 hover:text-indigo-600">
                    <span>👤</span>
                    <span>Profile</span>
                </a>
            </nav>
        </aside>
    )
}