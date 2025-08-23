
export default function PostList() {
    return (
        <div className="divide-y divide-gray-200">
            {[1, 2, 3].map((post) => (
                <div key={post} className="p-4">
                    <div className="flex space-x-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                            {/* User + Handle */}
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900">User {post}</span>
                                <span className="text-gray-500">@handle</span>
                            </div>
                            {/* Post content */}
                            <p className="text-gray-800 mt-1">
                                This is a sample post #{post}. Replace with real data later.
                            </p>
                            {/* Actions */}
                            <div className="flex space-x-6 text-gray-500 mt-2 text-sm">
                                <button className="hover:text-indigo-600">💬 12</button>
                                <button className="hover:text-indigo-600">🔁 4</button>
                                <button className="hover:text-indigo-600">❤️ 20</button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}