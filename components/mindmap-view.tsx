import type { MindmapNode } from "@/lib/types";

export function MindmapView({ items }: { items: MindmapNode[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.topic} className="rounded-2xl border-[1.5px] border-black bg-[#fbfaf5] p-4">
          <p className="font-semibold text-black">{item.topic}</p>
          <ul className="mt-3 grid gap-2">
            {item.children.map((child) => (
              <li key={child} className="text-sm leading-6 text-black/64">{child}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
