import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TrafficMetricList } from "../components/TrafficMetricList";

describe("TrafficMetricList", () => {
  it("uses one fixed height and scrolls only the data rows", () => {
    const html = renderToStaticMarkup(
      <TrafficMetricList label="Source" primaryLabel="Views" secondaryLabel="Unique visitors">
        <div>row</div>
      </TrafficMetricList>,
    );

    expect(html).toContain("h-60");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("Source");
    expect(html).toContain("Unique visitors");
  });
});
