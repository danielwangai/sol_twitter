"use client";
import FloatingButton from "@/app/components/FloatingButton";
import Sidebar from "@/app/components/Sidebar";
import PostList from "@/app/components/PostList";

export default function Home() {
  return (
      <div className="flex max-w-7xl mx-auto">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Posts Feed */}
          <main className="flex-1 border-r border-gray-200">
              {/* New Post Box */}
              <div className="p-4 border-b border-gray-200">
          <textarea
              placeholder="What's happening?"
              className="w-full border rounded-lg p-3 text-gray-800 focus:ring focus:ring-indigo-200"
          />
                  <div className="flex justify-end mt-2">
                      <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium">
                          Post
                      </button>
                  </div>
              </div>

              {/* Posts List */}
              <PostList />

              <FloatingButton onClick={() => console.log("Create")} />
          </main>
      </div>
  );
}
