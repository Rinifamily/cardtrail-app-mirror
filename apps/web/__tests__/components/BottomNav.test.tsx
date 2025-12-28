import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/layout/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

describe("BottomNav", () => {
  it("renders all navigation tabs", () => {
    render(<BottomNav />);

    ["大盘", "持仓", "搜卡", "榜单", "我的"].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it("marks the active tab with aria-current", () => {
    render(<BottomNav />);

    const active = screen.getByText("大盘");
    expect(active.closest("a")).toHaveAttribute("aria-current", "page");
  });
});
