/**
 * RealBizCraft attribution watermark.
 *
 * Fixed in the bottom-right corner of every authenticated page. Follows the
 * RealBizCraft design guidelines: circular logo with a thin orange ring, the
 * wordmark in italic Playfair Display orange (#ED8038), and a lighter
 * attribution line. Kept subtle and translucent so it never competes with the
 * dashboard, and fades further on hover to reveal anything beneath it.
 */
export function Watermark() {
  return (
    <div
      aria-hidden
      className="fixed bottom-4 right-4 z-40 flex select-none flex-col items-center gap-1.5 opacity-70 transition-opacity duration-200 hover:opacity-20"
    >
      <img
        src="/realbizcraft-mark.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 rounded-full bg-white object-cover ring-2 ring-[#ED8038]"
      />
      <span
        className="text-[13px] font-bold italic leading-none text-[#ED8038]"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        RealBizCraft
      </span>
      <span className="text-[10px] tracking-wide text-muted-foreground">
        by Samala Vamshi
      </span>
    </div>
  );
}
