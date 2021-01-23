import "dotenv/config";

import { WebSocketProvider } from "@ethersproject/providers";

import { Context } from "../../src/data/context";
import { estimateBlock, estimateBlockPrecise } from "../../src/utils/block";

const Timestamp = 1592179200;
const ActualBlock = 10267003;

describe("block estimation", () => {
  let provider: WebSocketProvider;
  let ctx: Context;

  beforeAll(() => {
    provider = new WebSocketProvider(process.env.WEB3_PROVIDER ?? "");
    ctx = new Context({ provider, etherscan: process.env.ETHERSCAN_KEY });
  });

  it("loose estimation (network)", async () => {
    const block = await provider.getBlockNumber();
    const estimation = estimateBlock(Timestamp, block);
    expect(estimation).toBeGreaterThanOrEqual(ActualBlock - 8000);
    return expect(estimation).toBeLessThanOrEqual(ActualBlock + 8000);
  });

  it(
    "precise estimation (network)",
    async () => {
      const block = await provider.getBlockNumber();
      const estimation = await estimateBlockPrecise(Timestamp, block, ctx);
      expect(estimation).toBeGreaterThanOrEqual(ActualBlock - 50);
      return expect(estimation).toBeLessThanOrEqual(ActualBlock + 50);
    },
    60 * 1000
  );

  afterAll(() => {
    return provider.destroy();
  });
});
