import React from "react";

export function GooglePhotosPinwheel({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Google Photos official geometry: 4 rounded semi-circle pinwheel blades */}
      {/* Top Red blade */}
      <path
        d="M96 96V36C96 16.1177 79.8823 0 60 0C40.1177 0 24 16.1177 24 36C24 55.8823 40.1177 72 60 72H96V96Z"
        fill="#EA4335"
      />
      {/* Right Yellow blade */}
      <path
        d="M96 96H156C175.882 96 192 79.8823 192 60C192 40.1177 175.882 24 156 24C136.118 24 120 40.1177 120 60V96H96Z"
        fill="#FBBC04"
      />
      {/* Bottom Green blade */}
      <path
        d="M96 96V156C96 175.882 112.118 192 132 192C151.882 192 168 175.882 168 156C168 136.118 151.882 120 132 120H96V96Z"
        fill="#34A853"
      />
      {/* Left Blue blade */}
      <path
        d="M96 96H36C16.1177 96 0 112.118 0 132C0 151.882 16.1177 168 36 168C55.8823 168 72 151.882 72 132V96H96Z"
        fill="#4285F4"
      />
    </svg>
  );
}

export function GooglePhotosWordmark({ className = "h-5" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="font-sans font-medium text-[19px] text-[#444746] tracking-[-0.02em] select-none">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC04]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
        <span className="ml-1 text-[#444746] font-normal">Photos</span>
      </span>
    </div>
  );
}
