import {
  Globe,
  CircleDot,
  ExternalLink,
  ShieldCheck,
  Newspaper,
  Building2,
  Code2,
  BarChart2,
  Zap,
  LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { SimilarStartup } from "@/types/analysis";

interface Props {
  startups: SimilarStartup[];
}

const ICON_MAP: Record<
  string,
  { icon: LucideIcon; iconColor: string; color: string }
> = {
  shield: {
    icon: ShieldCheck,
    iconColor: "text-blue-400",
    color: "from-blue-500/20 to-indigo-500/0",
  },
  newspaper: {
    icon: Newspaper,
    iconColor: "text-emerald-400",
    color: "from-emerald-500/20 to-teal-500/0",
  },
  building: {
    icon: Building2,
    iconColor: "text-purple-400",
    color: "from-purple-500/20 to-fuchsia-500/0",
  },
  circle: {
    icon: CircleDot,
    iconColor: "text-amber-400",
    color: "from-amber-500/20 to-orange-500/0",
  },
  globe: {
    icon: Globe,
    iconColor: "text-rose-400",
    color: "from-rose-500/20 to-pink-500/0",
  },
  code: {
    icon: Code2,
    iconColor: "text-cyan-400",
    color: "from-cyan-500/20 to-sky-500/0",
  },
  chart: {
    icon: BarChart2,
    iconColor: "text-violet-400",
    color: "from-violet-500/20 to-purple-500/0",
  },
  bolt: {
    icon: Zap,
    iconColor: "text-yellow-400",
    color: "from-yellow-500/20 to-orange-500/0",
  },
};

export function ComparableStartups({ startups }: Props) {
  return (
    <div className="divide-y divide-white/[0.04] bg-neutral-950/30">
      {startups.map((startup, index) => {
        const mapping = ICON_MAP[startup.icon_type] || ICON_MAP["globe"];
        const Icon = mapping.icon;
        const sequentialId = String(index + 1).padStart(2, "0");
        const hasUrl = typeof startup.url === "string" && startup.url.trim() !== "";

        return (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index + 0.3, duration: 0.5 }}
            key={`${startup.company_name}-${index}`}
            className="group relative flex flex-col sm:flex-row items-start sm:items-center p-6 sm:px-8 sm:py-6 hover:bg-white/[0.02] transition-colors duration-300 cursor-pointer"
          >
            {/* Subtle Background Gradient on Hover */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${mapping.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-none`}
            />

            <div className="flex items-center gap-6 w-full relative z-10">
              {/* Number & Icon Group */}
              <div className="flex items-center gap-5 w-[140px] shrink-0">
                <span className="text-[28px] font-light text-white/10 group-hover:text-white/20 transition-colors font-mono tracking-tighter select-none">
                  {sequentialId}
                </span>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.05] shadow-inner group-hover:scale-110 group-hover:bg-white/[0.08] transition-all duration-300">
                  <Icon
                    strokeWidth={1.5}
                    className={`w-5 h-5 ${mapping.iconColor}`}
                  />
                </div>
              </div>

              {/* Content Section */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-3 mb-1.5">
                  <h3 className="text-[16px] font-medium text-neutral-200 group-hover:text-white transition-colors">
                    {startup.company_name}
                  </h3>
                  <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[11px] font-medium text-neutral-400 tracking-wide uppercase">
                    {startup.category_tag}
                  </div>
                </div>
                <p className="text-[13px] text-neutral-500 group-hover:text-neutral-300 leading-relaxed line-clamp-2 transition-colors">
                  {startup.description}
                </p>
              </div>

              {/* Action */}
              {hasUrl && (
                <div className="shrink-0 hidden sm:block relative group/btn z-20">
                  <a
                    href={startup.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] text-neutral-400 group-hover:bg-white/[0.1] group-hover:text-white group-hover:border-white/[0.1] hover:!bg-white/[0.15] transition-all duration-300 focus:outline-none"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-all duration-200 translate-y-1 group-hover/btn:translate-y-0 z-50">
                    <div className="bg-[#1A1A24] border border-white/10 shadow-xl text-neutral-200 text-[11px] font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap">
                      View source
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Action & Pill */}
            <div className="flex sm:hidden items-center justify-between w-full mt-4 pl-[76px] relative z-10">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.05] text-[11px] font-medium text-neutral-400 tracking-wide uppercase">
                {startup.category_tag}
              </div>
              {hasUrl && (
                <a
                  href={startup.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors z-20"
                >
                  View source
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
