"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#c9a56a] text-black font-semibold hover:bg-[#e0c490] text-sm"
    >
      Print ID Card
    </button>
  );
}
