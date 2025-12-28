import {
  CTIHeroSkeleton,
  ChartSkeleton,
  CarouselSkeleton,
  MoversSkeleton,
  VolumeSkeleton,
} from "@/components/market/Skeletons";

export default function MarketLoading() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <CTIHeroSkeleton />
      <div className="h-10 w-72 animate-pulse rounded-full bg-muted/60" />
      <ChartSkeleton />
      <CarouselSkeleton />
      <MoversSkeleton />
      <VolumeSkeleton />
    </div>
  );
}
