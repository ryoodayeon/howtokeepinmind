import TastingApp from "@/components/tasting/App";
export default function Page() {
  return (
    <TastingApp
      config={{
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        mapStyle: process.env.NEXT_PUBLIC_MAP_STYLE_URL || "",
      }}
    />
  );
}
