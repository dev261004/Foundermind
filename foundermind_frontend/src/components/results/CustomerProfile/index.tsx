import {
  AlertTriangle,
  Gem,
  Tag,
  Zap,
} from "lucide-react";
import type {
  CustomerProfile as CustomerProfileData,
  CustomerProfileBehavior,
  CustomerProfileNeed,
  CustomerProfilePainPoint,
  CustomerProfileValueProp,
} from "@/types/analysis";

const RatingDots = ({ score }: { score: number }) => {
  return (
    <div className="group relative flex items-center cursor-help ml-4 shrink-0 mt-1 sm:mt-0">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => {
          if (score >= i) {
            return <div key={i} className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />;
          }
          if (score >= i - 0.5) {
            return (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 from-50% to-[#2F2F3B] to-50% shadow-[0_0_4px_rgba(251,191,36,0.2)]" />
            );
          }
          return <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#2F2F3B]" />;
        })}
      </div>

      <div className="absolute right-0 bottom-full mb-2 w-max px-2.5 py-1.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] font-medium rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0 text-center">
        Severity Score: <span className="text-amber-400 font-bold">{score}</span> / 4
      </div>
    </div>
  );
};

function mapSeverityToScore(severity: 1 | 2 | 3): number {
  switch (severity) {
    case 1:
      return 1;
    case 2:
      return 2.5;
    case 3:
    default:
      return 4;
  }
}

function renderIcon(iconEmoji: string, fallback: string) {
  return iconEmoji || fallback;
}

function NeedsList({ needs }: { needs: CustomerProfileNeed[] }) {
  return (
    <ul className="flex flex-col text-[14px] text-[#C0C0D0]">
      {needs.map((need, index) => (
        <li
          key={`${need.text}-${index}`}
          className={`flex items-start gap-2 py-3 px-4 ${index < needs.length - 1 ? "border-b border-white/[0.03]" : ""}`}
        >
          <span className="shrink-0 mt-0.5">
            {renderIcon(need.icon_emoji, "•")}
          </span>
          <p>{need.text}</p>
        </li>
      ))}
    </ul>
  );
}

function PainPointsList({
  painPoints,
}: {
  painPoints: CustomerProfilePainPoint[];
}) {
  return (
    <ul className="flex flex-col text-[14px] text-[#C0C0D0]">
      {painPoints.map((painPoint, index) => (
        <li
          key={`${painPoint.text}-${index}`}
          className={`flex sm:flex-row flex-col sm:items-center justify-between py-3 px-4 ${index < painPoints.length - 1 ? "border-b border-white/[0.03]" : ""}`}
        >
          <p className="max-w-[400px]">{painPoint.text}</p>
          <RatingDots score={mapSeverityToScore(painPoint.severity)} />
        </li>
      ))}
    </ul>
  );
}

function BuyingBehaviorTags({
  items,
}: {
  items: CustomerProfileBehavior[];
}) {
  return (
    <div className="flex flex-wrap gap-2.5 px-4 pb-4">
      <div className="flex flex-wrap gap-2.5">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1D26] border border-white/5 text-[13px] font-medium text-[#E0E0E0]"
          >
            <span>{renderIcon(item.icon_emoji, "•")}</span> {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValuePropositionList({
  items,
}: {
  items: CustomerProfileValueProp[];
}) {
  return (
    <ul className="flex flex-col text-[14px] text-[#C0C0D0]">
      {items.map((item, index) => (
        <li
          key={`${item.text}-${index}`}
          className={`flex items-start gap-2 py-3 px-4 ${index < items.length - 1 ? "border-b border-white/[0.03]" : ""}`}
        >
          <span className="shrink-0 mt-0.5 text-xl">
            {renderIcon(item.icon_emoji, "•")}
          </span>
          <p>{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function CustomerProfile({
  profile,
}: {
  profile: CustomerProfileData;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6">
      <div className="flex flex-col gap-6 bg-[#15151E] border border-white/5 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/20 blur-[50px] rounded-full pointer-events-none" />

        <div className="relative">
          <div className="w-[140px] h-[140px] mx-auto rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-purple-600 flex items-center justify-center shadow-[-5px_10px_30px_rgba(139,92,246,0.3)]">
            <span className="text-4xl font-extrabold text-white tracking-wider">ICP</span>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-[26px] font-bold leading-tight mb-3">
              {profile.persona_name}
            </h2>
            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
              Age {profile.age_range}
            </span>
          </div>

          <p className="text-[14px] text-[#A0A0B0] leading-relaxed text-balance">
            {profile.profession}
          </p>

          <div className="relative group cursor-help flex flex-wrap gap-2">
            {profile.buying_behavior_tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-2.5 py-1 rounded-md bg-[#1C1D26] text-[#A0A0B0] text-[11px] font-semibold tracking-wider uppercase border border-white/5"
              >
                {tag}
              </span>
            ))}
            <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0 text-left">
              Key behavioral traits defining how this persona thinks and acts.
            </div>
          </div>

          <div className="relative bg-[#111219] p-4 rounded-lg border border-white/5 before:content-[''] before:absolute before:left-0 before:top-0 before:w-1 before:h-full before:bg-purple-500 before:rounded-l-lg group cursor-help">
            <p className="italic text-[#C0C0D0] text-[13px] leading-relaxed">
              {profile.quote}
            </p>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0 text-center">
              A representative quote capturing the core sentiment and frustration of this persona.
            </div>
          </div>

          <div className="flex flex-col gap-2.5 bg-[#111219] rounded-lg p-3.5 border border-white/5">
            <div className="flex items-center justify-between text-[13px] gap-4">
              <span className="text-[#8A8A98]">Annual Income</span>
              <span className="text-[#E0E0E0] font-medium text-right">
                {profile.demographics.annual_income}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] gap-4">
              <span className="text-[#8A8A98]">Locations</span>
              <span className="text-[#E0E0E0] font-medium text-right">
                {profile.demographics.locations}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px] gap-4">
              <span className="text-[#8A8A98]">Education</span>
              <span className="text-[#E0E0E0] font-medium text-right">
                {profile.demographics.education}
              </span>
            </div>
          </div>

          <div className="relative group cursor-help flex flex-col gap-2">
            <span className="text-[11px] font-bold text-[#8A8A98] uppercase tracking-wider">Brand Affinities</span>
            <div className="flex flex-wrap gap-2">
              {profile.brand_affinities.map((brand, index) => (
                <span
                  key={`${brand}-${index}`}
                  className="px-2.5 py-1.5 rounded-md bg-[#111219] text-[#E0E0E0] text-[12px] font-medium border border-white/5"
                >
                  {brand}
                </span>
              ))}
            </div>
            <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0 text-left">
              Brands and platforms this persona frequently uses, indicating their UX expectations.
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <div className="flex justify-between items-end mb-2">
            <div className="relative group flex items-center cursor-help">
              <span className="text-sm font-semibold text-white border-b border-dashed border-white/30 pb-0.5">Persona Strength</span>

              <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0">
                This score indicates how well the target audience matches your core user base based on behavioral and demographic data.
              </div>
            </div>
            <span className="text-sm text-purple-400 font-medium">
              {profile.persona_strength}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#2A2B35] rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.8)]"
              style={{ width: `${profile.persona_strength}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col bg-[#15151E] border border-white/5 rounded-xl shadow-xl overflow-hidden p-1 gap-1">
        <div className="bg-[#111219] pb-1 border-l-[3px] border-[#38bdf8] rounded-r-lg mb-2">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#38bdf8]/10 mb-1">
            <Zap
              size={18}
              strokeWidth={2}
              className="text-[#38bdf8] fill-[#38bdf8]/20"
            />
            <div className="relative group flex items-center cursor-help">
              <h3 className="font-semibold text-[#38bdf8] border-b border-dashed border-[#38bdf8]/40 pb-[1px] leading-none">Needs</h3>
              <div className="absolute top-full left-0 mt-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 -translate-y-1 group-hover:translate-y-0">
                Essential requirements and expectations this persona has for the product.
              </div>
            </div>
          </div>
          <NeedsList needs={profile.needs} />
        </div>

        <div className="bg-[#111219] pb-1 border-l-[3px] border-[#fbbf24] rounded-r-lg mb-2">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#fbbf24]/10 mb-1">
            <AlertTriangle
              size={18}
              strokeWidth={2}
              className="text-[#fbbf24]"
            />
            <div className="relative group flex items-center cursor-help">
              <h3 className="font-semibold text-[#fbbf24] border-b border-dashed border-[#fbbf24]/40 pb-[1px] leading-none">Pain Points</h3>
              <div className="absolute top-full left-0 mt-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 -translate-y-1 group-hover:translate-y-0">
                Primary frustrations, obstacles, and negative experiences they currently face.
              </div>
            </div>
          </div>
          <PainPointsList painPoints={profile.pain_points} />
        </div>

        <div className="bg-[#111219] pb-4 border-l-[3px] border-[#34d399] rounded-r-lg mb-2">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#34d399]/10 mb-3">
            <Tag size={18} strokeWidth={2} className="text-[#34d399]" />
            <div className="relative group flex items-center cursor-help">
              <h3 className="font-semibold text-[#34d399] border-b border-dashed border-[#34d399]/40 pb-[1px] leading-none">Buying Behavior</h3>
              <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0">
                How this persona typically researches, evaluates, and makes purchasing decisions.
              </div>
            </div>
          </div>
          <BuyingBehaviorTags items={profile.buying_behavior} />
        </div>

        <div className="bg-[#111219] pb-1 border-l-[3px] border-[#c084fc] rounded-r-lg">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#c084fc]/10 mb-1">
            <Gem size={18} strokeWidth={2} className="text-[#c084fc]" />
            <div className="relative group flex items-center cursor-help">
              <h3 className="font-semibold text-[#c084fc] border-b border-dashed border-[#c084fc]/40 pb-[1px] leading-none">Value Proposition</h3>
              <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-[#1C1D26] border border-white/10 text-xs text-[#C0C0D0] leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-10 translate-y-1 group-hover:translate-y-0">
                The core benefits and unique value this product delivers to this specific persona.
              </div>
            </div>
          </div>
          <ValuePropositionList items={profile.value_proposition} />
        </div>
      </div>
    </div>
  );
}
