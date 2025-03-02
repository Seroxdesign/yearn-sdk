/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { BigNumber } from "@ethersproject/bignumber";
import { MaxUint256 } from "@ethersproject/constants";
import { Contract } from "@ethersproject/contracts";

import {
  Address,
  AssetDynamic,
  ChainId,
  Context,
  ERC20,
  IconMap,
  Integer,
  Position,
  SdkError,
  Token,
  TokenAllowance,
  TokenMetadata,
  Usdc,
  VaultInterface,
  Yearn,
  ZapProtocol,
} from "..";
import { EthAddress, WethAddress } from "../helpers";
import { PartnerService } from "../services/partner";
import {
  createMockAssetDynamicVaultV2,
  createMockAssetStaticVaultV2,
  createMockEarningsUserData,
  createMockToken,
  createMockTokenBalance,
  createMockVaultMetadata,
} from "../test-utils/factories";

const earningsAccountAssetsDataMock = jest.fn();
const tokensMetadataMock: jest.Mock<Promise<TokenMetadata[]>> = jest.fn();
const tokenAllowanceMock: jest.Mock<Promise<TokenAllowance>> = jest.fn();
const tokenApproveMock: jest.Mock<Promise<TransactionResponse>> = jest.fn();
const zapperZapOutMock = jest.fn();
const zapperZapInMock = jest.fn().mockResolvedValue({
  to: "to",
  from: "from",
  data: "data",
  value: "100",
  gas: "100",
  gasPrice: "100",
});
const portalsZapOutMock = jest.fn();
const portalsZapInMock = jest.fn().mockResolvedValue({
  to: "to",
  from: "from",
  data: "data",
  value: "100",
  gasLimit: "100",
  gasPrice: "100",
});
const supportedVaultAddressesMock = jest.fn();
const helperTokenBalancesMock = jest.fn();
const helperTokensMock: jest.Mock<Promise<ERC20[]>> = jest.fn();
const lensAdaptersVaultsV2PositionsOfMock = jest.fn();
const lensAdaptersVaultsV2AssetsStaticMock = jest.fn();
const lensAdaptersVaultsV2AssetsDynamicMock = jest.fn();
const lensAdaptersVaultsV2TokensMock = jest.fn();
const sendTransactionMock = jest.fn();
const populateTransactionMock = jest.fn();
const cachedFetcherFetchMock = jest.fn();
const assetReadyMock = jest.fn();
const assetIconMock: jest.Mock<IconMap<Address>> = jest.fn();
const assetAliasMock = jest.fn();
const oracleGetPriceUsdcMock: jest.Mock<Promise<Usdc>> = jest.fn();
const metaVaultsMock = jest.fn();
const visionApyMock = jest.fn();
const vaultsStrategiesMetadataMock = jest.fn();
const assetsHistoricEarningsMock = jest.fn();
const sendTransactionUsingServiceMock = jest.fn();
const populateTransactionUsingMockService = jest.fn();
const partnerPopulateDepositTransactionMock = jest.fn();
const partnerIsAllowedMock = jest.fn().mockReturnValue(true);
const propertiesAggregatorGetPropertiesMock = jest.fn();

jest.mock("../services/partner", () => ({
  PartnerService: jest.fn().mockImplementation(() => ({
    populateDepositTransaction: partnerPopulateDepositTransactionMock,
    isAllowed: partnerIsAllowedMock,
    partnerId: "0x000partner",
  })),
}));

jest.mock("../yearn", () => ({
  Yearn: jest.fn().mockImplementation(() => ({
    services: {
      propertiesAggregator: {
        getProperties: propertiesAggregatorGetPropertiesMock,
      },
      meta: {
        vaults: metaVaultsMock,
      },
      lens: {
        adapters: {
          vaults: {
            v2: {
              positionsOf: lensAdaptersVaultsV2PositionsOfMock,
              assetsStatic: lensAdaptersVaultsV2AssetsStaticMock,
              assetsDynamic: lensAdaptersVaultsV2AssetsDynamicMock,
              tokens: lensAdaptersVaultsV2TokensMock,
            },
          },
        },
      },
      vision: {
        apy: visionApyMock,
      },
      asset: {
        ready: assetReadyMock,
        icon: assetIconMock,
        alias: assetAliasMock,
      },
      helper: {
        tokenBalances: helperTokenBalancesMock,
        tokens: helperTokensMock,
      },
      oracle: {
        getPriceUsdc: oracleGetPriceUsdcMock,
      },
      zapper: {
        zapOut: zapperZapOutMock,
        zapIn: zapperZapInMock,
        supportedVaultAddresses: supportedVaultAddressesMock,
      },
      portals: {
        zapOut: portalsZapOutMock,
        zapIn: portalsZapInMock,
        supportedVaultAddresses: supportedVaultAddressesMock,
      },
      transaction: {
        sendTransaction: sendTransactionUsingServiceMock,
        populateTransaction: populateTransactionUsingMockService,
      },
    },
    strategies: {
      vaultsStrategiesMetadata: vaultsStrategiesMetadataMock,
    },
    earnings: {
      accountAssetsData: earningsAccountAssetsDataMock,
      assetsHistoricEarnings: assetsHistoricEarningsMock,
    },
    tokens: {
      metadata: tokensMetadataMock,
      allowance: tokenAllowanceMock,
      approve: tokenApproveMock,
    },
  })),
}));

jest.mock("../cache", () => ({
  CachedFetcher: jest.fn().mockImplementation(() => ({
    fetch: cachedFetcherFetchMock,
  })),
}));

jest.mock("../context", () => ({
  Context: jest.fn().mockImplementation(() => ({
    provider: {
      write: {
        getSigner: jest.fn().mockImplementation(() => ({
          sendTransaction: sendTransactionMock,
          populateTransaction: populateTransactionMock,
        })),
      },
    },
  })),
}));

const PickleJarsMock = jest.requireMock("../services/partners/pickle");
jest.mock("../services/partners/pickle", () => ({
  PickleJars: [],
}));

jest.mock("@ethersproject/contracts", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    populateTransaction: { deposit: jest.fn(), withdraw: jest.fn() },
  })),
}));

describe("VaultInterface", () => {
  const accountAddress: Address = "0xAccount";
  const vaultAddress: Address = "0xVault";
  const tokenAddress: Address = "0xToken";
  const spenderAddress: Address = "0xSpender";
  let vaultInterface: VaultInterface<1>;
  let mockedYearn: Yearn<ChainId>;

  beforeEach(() => {
    mockedYearn = new (Yearn as jest.Mock<Yearn<ChainId>>)();
    vaultInterface = new VaultInterface(mockedYearn, 1, new Context({}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("get", () => {
    describe("when the fetcher tokens are cached", () => {
      let cachedToken: Token;
      let randomCachedToken: Token;

      beforeEach(() => {
        cachedToken = createMockToken({ address: "0xCachedToken" });
        randomCachedToken = createMockToken({ address: "0xCachedRandom" });
        cachedFetcherFetchMock.mockResolvedValue([cachedToken, randomCachedToken]);
      });

      describe("when the addresses filter is given", () => {
        it("should get all cached tokens in the addresses array filter", async () => {
          const actualGet = await vaultInterface.get([cachedToken.address]);

          expect(actualGet).toEqual([cachedToken]);
        });
      });

      describe("when the addresses filter is not given", () => {
        it("should get all cached tokens", async () => {
          const actualGet = await vaultInterface.get();

          expect(actualGet).toEqual([cachedToken, randomCachedToken]);
        });
      });
    });

    describe("when the fetcher tokens are not cached", () => {
      let getStaticMock: jest.Mock;
      let vaultDynamic: AssetDynamic<"VAULT_V2">;

      beforeEach(() => {
        cachedFetcherFetchMock.mockResolvedValue(undefined);
        metaVaultsMock.mockResolvedValue([]);
        const vaultStatic = createMockAssetStaticVaultV2();
        getStaticMock = jest.fn().mockResolvedValue([vaultStatic]);
        (vaultInterface as any).getStatic = getStaticMock;
        vaultDynamic = createMockAssetDynamicVaultV2();
        const getDynamicMock = jest.fn().mockResolvedValue([vaultDynamic]);
        (vaultInterface as any).getDynamic = getDynamicMock;
        vaultsStrategiesMetadataMock.mockResolvedValue([
          {
            vaultAddress: "0x001",
            strategiesMetadata: {
              name: "strategiesMetadataName",
              description: "strategiesMetadataDescription",
              address: "strategiesMetadataAddress",
              protocols: ["strategiesMetadata"],
            },
          },
        ]);
        assetsHistoricEarningsMock.mockResolvedValue([
          {
            assetAddress: "0x001",
            decimals: 18,
            dayData: [
              {
                earnings: { amount: "1", amountUsdc: "1" },
                date: "12-02-2022",
              },
            ],
          },
        ]);
      });

      it("should get all yearn vaults", async () => {
        const actualGet = await vaultInterface.get();

        expect(actualGet).toEqual([
          {
            ...vaultDynamic,
            decimals: "18",
            name: "WETH yVault",
            symbol: "yvWETH",
            token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            version: "0.4.2",
            metadata: {
              ...vaultDynamic.metadata,
              historicEarnings: [
                {
                  date: "12-02-2022",
                  earnings: {
                    amount: "1",
                    amountUsdc: "1",
                  },
                },
              ],
              strategies: {
                strategiesMetadata: {
                  address: "strategiesMetadataAddress",
                  description: "strategiesMetadataDescription",
                  name: "strategiesMetadataName",
                  protocols: ["strategiesMetadata"],
                },
                vaultAddress: "0x001",
              },
            },
          },
        ]);
        expect(metaVaultsMock).toHaveBeenCalledTimes(1);
        expect(getStaticMock).toHaveBeenCalledTimes(1);
        expect(getStaticMock).toHaveBeenCalledWith(undefined, undefined);
      });

      describe("when dynamic asset does not exist for asset address", () => {
        beforeEach(() => {
          const vaultDynamic = createMockAssetDynamicVaultV2({ address: "0xNonExistant" });
          (vaultInterface as any).getDynamic = jest.fn().mockResolvedValue([vaultDynamic]);
        });

        it("should throw", async () => {
          const balance = createMockTokenBalance({ address: "0x001" });
          helperTokenBalancesMock.mockResolvedValue([balance]);

          try {
            await vaultInterface.get();
          } catch (error) {
            expect(error).toStrictEqual(new SdkError("Dynamic asset does not exist for 0x001"));
          }
        });
      });
    });
  });

  describe("getStatic", () => {
    it("should get static part of yearn vaults", async () => {
      const position = {
        assetAddress: "0xPositionAssetAddress",
        tokenAddress: "0xPositionTokenAddress",
        typeId: "positionTypeId",
        balance: "1",
        underlyingTokenBalance: {
          amount: "1",
          amountUsdc: "1",
        },
        assetAllowances: [
          {
            owner: "0xAssetAllowancesOwner",
            spender: "0xAssetAllowancesSpender",
            amount: "2",
          },
        ],
        tokenAllowances: [
          {
            owner: "0xTokenAllowancesOwner",
            spender: "0xTokenAllowancesSpender",
            amount: "3",
          },
        ],
      };
      lensAdaptersVaultsV2AssetsStaticMock.mockResolvedValue([position]);

      const actualGetStatic = await vaultInterface.getStatic(["0x001"]);

      expect(actualGetStatic).toEqual([position]);
      expect(lensAdaptersVaultsV2AssetsStaticMock).toHaveBeenCalledTimes(1);
      expect(lensAdaptersVaultsV2AssetsStaticMock).toHaveBeenCalledWith(["0x001"], undefined);
    });
  });

  describe("getDynamic", () => {
    describe("when the fetcher tokens are cached", () => {
      let cachedToken: Token;
      let randomCachedToken: Token;

      beforeEach(() => {
        cachedToken = createMockToken({ address: "0xCachedToken" });
        randomCachedToken = createMockToken({ address: "0xCachedRandom" });
        cachedFetcherFetchMock.mockResolvedValue([cachedToken, randomCachedToken]);
      });

      describe("when the addresses filter is given", () => {
        it("should get all cached tokens in the addresses array filter", async () => {
          const actualGetDynamic = await vaultInterface.getDynamic([cachedToken.address]);

          expect(actualGetDynamic).toEqual([cachedToken]);
        });
      });

      describe("when the addresses filter is not given", () => {
        it("should get all cached tokens", async () => {
          const actualGetDynamic = await vaultInterface.getDynamic();

          expect(actualGetDynamic).toEqual([cachedToken, randomCachedToken]);
        });
      });
    });

    describe("when the fetcher tokens are not cached", () => {
      beforeEach(() => {
        cachedFetcherFetchMock.mockResolvedValue(undefined);
        metaVaultsMock.mockResolvedValue([createMockVaultMetadata({ address: "0x001" })]);
        supportedVaultAddressesMock.mockResolvedValue([]);
      });

      describe("vaultMetadataOverrides", () => {
        beforeEach(() => {
          (vaultInterface as any).yearn.services.lens.adapters.vaults = [];
        });

        describe("when is provided", () => {
          it("should not call meta vaults", async () => {
            await vaultInterface.getDynamic(
              [],
              [{ address: "0xVaultMetadataOverrides", comment: "", hideAlways: false }]
            );

            expect(metaVaultsMock).not.toHaveBeenCalled();
          });
        });

        describe("when is not provided", () => {
          it("should get the vault's metadata", async () => {
            await vaultInterface.getDynamic([]);

            expect(metaVaultsMock).toHaveBeenCalledTimes(1);
            expect(supportedVaultAddressesMock).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe("when tokenId is WethAddress", () => {
        let assetsDynamic: AssetDynamic<"VAULT_V2">;

        beforeEach(() => {
          assetsDynamic = createMockAssetDynamicVaultV2({
            tokenId: WethAddress,
          });
          lensAdaptersVaultsV2AssetsDynamicMock.mockResolvedValue([assetsDynamic]);
          visionApyMock.mockResolvedValue([]);
          assetIconMock.mockReturnValue({ [EthAddress]: "eth.png" });
        });

        it("should set the ETH metadata", async () => {
          const actualGetDynamic = await vaultInterface.getDynamic();

          expect(actualGetDynamic).toEqual([
            {
              ...assetsDynamic,
              metadata: {
                ...assetsDynamic.metadata,
                displayIcon: {
                  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": "eth.png",
                },
              },
            },
          ]);
          expect(lensAdaptersVaultsV2AssetsDynamicMock).toHaveBeenCalledTimes(1);
          expect(lensAdaptersVaultsV2AssetsDynamicMock).toHaveBeenCalledWith(undefined, undefined);
          expect(assetIconMock).toHaveBeenCalledTimes(1);
          expect(assetIconMock).not.toHaveBeenCalledWith(WethAddress);
          expect(assetIconMock).toHaveBeenCalledWith(EthAddress);
        });
      });

      describe("when tokenId is not WethAddress", () => {
        let assetsDynamic: AssetDynamic<"VAULT_V2">;

        beforeEach(() => {
          assetsDynamic = createMockAssetDynamicVaultV2();
          lensAdaptersVaultsV2AssetsDynamicMock.mockResolvedValue([assetsDynamic]);
          visionApyMock.mockResolvedValue([]);
          assetIconMock.mockReturnValue({ "0x001": "0x001.png" });
          assetAliasMock.mockReturnValueOnce({
            name: "aliasTokenName",
            symbol: "ALIAS_TOKEN_SYMBOL",
            address: "0x001",
          });
        });

        it("should get dynamic part of yearn vaults", async () => {
          const actualGetDynamic = await vaultInterface.getDynamic();

          expect(actualGetDynamic).toEqual([
            {
              ...assetsDynamic,
              metadata: {
                ...assetsDynamic.metadata,
                displayIcon: {
                  "0x001": "0x001.png",
                },
                displayName: "Vault Metadata",
                defaultDisplayToken: assetsDynamic.tokenId,
              },
            },
          ]);
          expect(lensAdaptersVaultsV2AssetsDynamicMock).toHaveBeenCalledTimes(1);
          expect(lensAdaptersVaultsV2AssetsDynamicMock).toHaveBeenCalledWith(undefined, undefined);
          expect(assetIconMock).toHaveBeenCalledTimes(1);
          expect(assetIconMock).toHaveBeenCalledWith("0x001Dynamic");
          expect(assetAliasMock).toHaveBeenCalledTimes(1);
          expect(assetAliasMock).toHaveBeenCalledWith("0x001Dynamic");
        });
      });
    });
  });

  describe("positionsOf", () => {
    let position: Position;

    beforeEach(() => {
      const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: EthAddress });
      vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);
      position = {
        assetAddress: "0xPositionAssetAddress",
        tokenAddress: "0xPositionTokenAddress",
        typeId: "positionTypeId",
        balance: "1",
        underlyingTokenBalance: {
          amount: "1",
          amountUsdc: "1",
        },
        assetAllowances: [
          {
            owner: "0xAssetAllowancesOwner",
            spender: "0xAssetAllowancesSpender",
            amount: "2",
          },
        ],
        tokenAllowances: [
          {
            owner: "0xTokenAllowancesOwner",
            spender: "0xTokenAllowancesSpender",
            amount: "3",
          },
        ],
      };
      lensAdaptersVaultsV2PositionsOfMock.mockResolvedValue([position]);
    });

    it("should get yearn vault positions for a particular address", async () => {
      const actualPositionsOf = await vaultInterface.positionsOf("0x001");

      expect(actualPositionsOf).toEqual([position]);
      expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledTimes(1);
      expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledWith("0x001", undefined, undefined);
    });

    describe("when positionsOf throws", () => {
      describe("when the addresses filter was provided", () => {
        it("should return all positions and not get the static vaults", async () => {
          lensAdaptersVaultsV2PositionsOfMock.mockRejectedValueOnce(new Error("positionsOf error"));
          lensAdaptersVaultsV2PositionsOfMock.mockResolvedValue([position]);

          const actualPositionsOf = await vaultInterface.positionsOf("0x001", ["0x001"]);

          expect(actualPositionsOf).toEqual([position]);
          expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledTimes(2);
          expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledWith("0x001", ["0x001"], undefined);
          expect(vaultInterface.getStatic).not.toHaveBeenCalled();
        });
      });

      describe("when the addresses filter was not provided", () => {
        it("should return all positions and get the static vaults", async () => {
          lensAdaptersVaultsV2PositionsOfMock.mockRejectedValueOnce(new Error("positionsOf error"));
          lensAdaptersVaultsV2PositionsOfMock.mockResolvedValue([position]);

          const actualPositionsOf = await vaultInterface.positionsOf("0x001");

          expect(actualPositionsOf).toEqual([position]);
          expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledTimes(2);
          expect(lensAdaptersVaultsV2PositionsOfMock).toHaveBeenCalledWith("0x001", ["0x001"], undefined);
          expect(vaultInterface.getStatic).toHaveBeenCalledTimes(1);
          expect(vaultInterface.getStatic).toHaveBeenCalledWith(undefined, undefined);
        });
      });
    });
  });

  describe("summaryOf", () => {
    it("should get the Vaults User Summary for a particular address", async () => {
      const earningsUserData = createMockEarningsUserData();
      earningsAccountAssetsDataMock.mockResolvedValueOnce(earningsUserData);

      const actualSummaryOf = await vaultInterface.summaryOf("0x001");

      expect(actualSummaryOf).toEqual({ earnings: "1", estimatedYearlyYield: "1", grossApy: 1, holdings: "1" });
      expect(earningsAccountAssetsDataMock).toHaveBeenCalledTimes(1);
      expect(earningsAccountAssetsDataMock).toHaveBeenCalledWith("0x001");
    });
  });

  describe("metadataOf", () => {
    beforeEach(() => {
      const earningsUserData = createMockEarningsUserData();
      earningsAccountAssetsDataMock.mockResolvedValueOnce(earningsUserData);
    });

    describe("when an addresses array is not given", () => {
      it("should get the Vault User Metadata for a particular address", async () => {
        const actualMetadataOf = await vaultInterface.metadataOf("0x001");

        expect(actualMetadataOf).toEqual([{ assetAddress: "0x001", earned: "1" }]);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledTimes(1);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledWith("0x001");
      });
    });

    describe("when an addresses array is given", () => {
      it("should get the Vault User Metadata when it is passed a specific address", async () => {
        const actualMetadataOf = await vaultInterface.metadataOf("0x001", ["0x000", "0x001", "0x002"]);

        expect(actualMetadataOf).toEqual([{ assetAddress: "0x001", earned: "1" }]);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledTimes(1);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledWith("0x001");
      });

      it("should return an empty array when it is not passed a specific address", async () => {
        const actualMetadataOf = await vaultInterface.metadataOf("0x001", ["0x000", "0x002"]);

        expect(actualMetadataOf).toEqual([]);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledTimes(1);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledWith("0x001");
      });

      it("should return an empty array when the addresses array is empty", async () => {
        const actualMetadataOf = await vaultInterface.metadataOf("0x001", []);

        expect(actualMetadataOf).toEqual([]);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledTimes(1);
        expect(earningsAccountAssetsDataMock).toHaveBeenCalledWith("0x001");
      });
    });
  });

  describe("balances", () => {
    describe("when token exists for balance", () => {
      it("should get all yearn vault's underlying token balances for a particular address", async () => {
        const existingToken = createMockToken();
        const existingToken2 = createMockToken({ address: "0xExisting" });
        const randomToken = createMockToken({ address: "0xRandom" });
        vaultInterface.tokens = jest.fn().mockResolvedValue([existingToken, existingToken2, randomToken]);

        const existingBalance = createMockTokenBalance();
        const existingBalance2 = createMockTokenBalance({ address: "0xExisting" });
        helperTokenBalancesMock.mockResolvedValue([existingBalance, existingBalance2]);

        const actualBalances = await vaultInterface.balances("0x001");

        expect(actualBalances).toEqual([
          { ...existingBalance, token: existingToken },
          { ...existingBalance2, token: existingToken2 },
        ]);
        expect(helperTokenBalancesMock).toHaveBeenCalledTimes(1);
        expect(helperTokenBalancesMock).toHaveBeenCalledWith("0x001", ["0x001", "0xExisting", "0xRandom"], undefined);
      });
    });

    describe("when token does not exist for balance", () => {
      it("should throw", async () => {
        const token = createMockToken({ address: "foo" });
        vaultInterface.tokens = jest.fn().mockResolvedValue([token]);

        const balance = createMockTokenBalance({ address: "0x001" });
        helperTokenBalancesMock.mockResolvedValue([balance]);

        try {
          await vaultInterface.balances("0x001");
        } catch (error) {
          expect(error).toStrictEqual(new SdkError("Token does not exist for Balance(0x001)"));
        }
      });
    });
  });

  describe("tokens", () => {
    describe("when the fetcher tokens are cached", () => {
      it("should get all cached tokens", async () => {
        const cachedToken = createMockToken({ address: "0xCachedToken" });
        cachedFetcherFetchMock.mockResolvedValue([cachedToken]);

        const actualTokens = await vaultInterface.tokens();

        expect(actualTokens).toEqual([cachedToken]);
      });
    });

    describe("when the fetcher tokens are not cached", () => {
      it("should get all yearn vault's underlying tokens", async () => {
        const tokenMock = createMockToken();
        cachedFetcherFetchMock.mockResolvedValue(undefined);
        lensAdaptersVaultsV2TokensMock.mockResolvedValue([tokenMock.address]);
        assetIconMock.mockReturnValue({
          [tokenMock.address]: "token-mock-icon.png",
        });
        helperTokensMock.mockReturnValue(Promise.resolve<Token[]>([tokenMock]));
        tokensMetadataMock.mockReturnValue(
          Promise.resolve<TokenMetadata[]>([
            { ...tokenMock, description: "Token mock metadata", website: "foo.bar", localization: {} },
          ])
        );
        oracleGetPriceUsdcMock.mockResolvedValue("1");
        const fillTokenMetadataOverridesMock = jest.fn();
        (vaultInterface as any).fillTokenMetadataOverrides = fillTokenMetadataOverridesMock;

        const actualTokens = await vaultInterface.tokens();

        expect(actualTokens).toEqual([
          {
            ...tokenMock,
            icon: "token-mock-icon.png",
            symbol: "DEAD",
            metadata: {
              address: "0x001",
              decimals: "18",
              description: "Token mock metadata",
              localization: {},
              symbol: "DEAD",
              name: "Dead Token",
              priceUsdc: "0",
              dataSource: "vaults",
              website: "foo.bar",
              supported: {},
            },
            name: "Dead Token",
            priceUsdc: "1",
            dataSource: "vaults",
            supported: {
              vaults: true,
            },
          },
        ]);
        expect(lensAdaptersVaultsV2TokensMock).toHaveBeenCalledTimes(1);
        expect(lensAdaptersVaultsV2TokensMock).toHaveBeenCalledWith(undefined); // no overrides
        expect(assetIconMock).toHaveBeenCalledTimes(1);
        expect(assetIconMock).toHaveBeenCalledWith(["0x001", EthAddress]);
        expect(helperTokensMock).toHaveBeenCalledTimes(1);
        expect(helperTokensMock).toHaveBeenCalledWith(["0x001"], undefined);
        expect(tokensMetadataMock).toHaveBeenCalledTimes(1);
        expect(tokensMetadataMock).toHaveBeenCalledWith(["0x001"]);
        expect(assetAliasMock).toHaveBeenCalledTimes(1);
        expect(assetAliasMock).toHaveBeenCalledWith("0x001");
        expect(fillTokenMetadataOverridesMock).toHaveBeenCalledTimes(1);
        expect(fillTokenMetadataOverridesMock).toHaveBeenCalledWith(actualTokens[0], actualTokens[0].metadata);
      });
    });
  });

  describe("getDepositAllowance", () => {
    it("should fetch token deposit allowance", async () => {
      const getDepositContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
      (vaultInterface as any).getDepositContractAddress = getDepositContractAddressMock;

      await vaultInterface.getDepositAllowance(accountAddress, vaultAddress, tokenAddress);

      expect(getDepositContractAddressMock).toHaveBeenCalledTimes(1);
      expect(getDepositContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
      expect(tokenAllowanceMock).toHaveBeenCalledTimes(1);
      expect(tokenAllowanceMock).toHaveBeenCalledWith(accountAddress, tokenAddress, spenderAddress);
    });
  });

  describe("getWithdrawAllowance", () => {
    it("should fetch token withdraw allowance", async () => {
      const getWithdrawContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
      (vaultInterface as any).getWithdrawContractAddress = getWithdrawContractAddressMock;

      await vaultInterface.getWithdrawAllowance(accountAddress, vaultAddress, tokenAddress);

      expect(getWithdrawContractAddressMock).toHaveBeenCalledTimes(1);
      expect(getWithdrawContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
      expect(tokenAllowanceMock).toHaveBeenCalledTimes(1);
      expect(tokenAllowanceMock).toHaveBeenCalledWith(accountAddress, vaultAddress, spenderAddress);
    });
  });

  describe("approveDeposit", () => {
    describe("when no amount provided", () => {
      it("should infinite approve", async () => {
        const getDepositContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
        (vaultInterface as any).getDepositContractAddress = getDepositContractAddressMock;

        await vaultInterface.approveDeposit(accountAddress, vaultAddress, tokenAddress);

        expect(getDepositContractAddressMock).toHaveBeenCalledTimes(1);
        expect(getDepositContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
        expect(tokenApproveMock).toHaveBeenCalledTimes(1);
        expect(tokenApproveMock).toHaveBeenCalledWith(
          accountAddress,
          tokenAddress,
          spenderAddress,
          MaxUint256.toString(),
          undefined
        );
      });
    });

    describe("when amount provided", () => {
      it("should approve exact amount", async () => {
        const amount: Integer = "1000000";
        const getDepositContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
        (vaultInterface as any).getDepositContractAddress = getDepositContractAddressMock;

        await vaultInterface.approveDeposit(accountAddress, vaultAddress, tokenAddress, amount);

        expect(getDepositContractAddressMock).toHaveBeenCalledTimes(1);
        expect(getDepositContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
        expect(tokenApproveMock).toHaveBeenCalledTimes(1);
        expect(tokenApproveMock).toHaveBeenCalledWith(accountAddress, tokenAddress, spenderAddress, amount, undefined);
      });
    });
  });

  describe("withdrawDeposit", () => {
    describe("when no amount provided", () => {
      it("should infinite approve", async () => {
        const getWithdrawContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
        (vaultInterface as any).getWithdrawContractAddress = getWithdrawContractAddressMock;

        await vaultInterface.approveWithdraw(accountAddress, vaultAddress, tokenAddress);

        expect(getWithdrawContractAddressMock).toHaveBeenCalledTimes(1);
        expect(getWithdrawContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
        expect(tokenApproveMock).toHaveBeenCalledTimes(1);
        expect(tokenApproveMock).toHaveBeenCalledWith(
          accountAddress,
          vaultAddress,
          spenderAddress,
          MaxUint256.toString(),
          undefined
        );
      });
    });

    describe("when amount provided", () => {
      it("should approve exact amount", async () => {
        const amount: Integer = "1000000";
        const getWithdrawContractAddressMock = jest.fn().mockResolvedValue(spenderAddress);
        (vaultInterface as any).getWithdrawContractAddress = getWithdrawContractAddressMock;

        await vaultInterface.approveWithdraw(accountAddress, vaultAddress, tokenAddress, amount);

        expect(getWithdrawContractAddressMock).toHaveBeenCalledTimes(1);
        expect(getWithdrawContractAddressMock).toHaveBeenCalledWith(vaultAddress, tokenAddress);
        expect(tokenApproveMock).toHaveBeenCalledTimes(1);
        expect(tokenApproveMock).toHaveBeenCalledWith(accountAddress, vaultAddress, spenderAddress, amount, undefined);
      });
    });
  });

  describe("deposit", () => {
    describe("when is zapping into pickle jar", () => {
      it("should call zapIn with correct arguments and pickle as the zapProtocol", async () => {
        const zapInMock = jest.fn();
        (vaultInterface as any).zapIn = zapInMock;
        (vaultInterface as any).isZappingIntoPickleJar = jest.fn().mockReturnValueOnce(true);

        const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

        await vaultInterface.deposit(vault, token, amount, account);

        expect(zapInMock).toHaveBeenCalledTimes(1);
        expect(zapInMock).toHaveBeenCalledWith(vault, token, amount, account, {}, ZapProtocol.PICKLE, {});
      });

      it("should call zapIn with correct arguments and pickle as the zapProtocol and the partner id", async () => {
        mockedYearn = new (Yearn as jest.Mock<Yearn<ChainId>>)();
        mockedYearn.services.partner = new (PartnerService as unknown as jest.Mock<PartnerService<ChainId>>)();
        vaultInterface = new VaultInterface(mockedYearn, 1, new Context({}));
        (vaultInterface as any).isZappingIntoPickleJar = jest.fn().mockReturnValueOnce(true);

        const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

        await vaultInterface.deposit(vault, token, amount, account, { slippage: 0.1 });

        expect(portalsZapInMock).toHaveBeenCalledTimes(1);
        expect(portalsZapInMock).toHaveBeenCalledWith(
          "0xVault",
          "0xToken",
          "1",
          "0xAccount",
          0.1,
          true,
          "0x000partner"
        );
      });
    });

    describe("when is not zapping into pickle jar", () => {
      beforeEach(() => {
        PickleJarsMock.PickleJars = [];
      });

      describe("when vault ref token is the same as the token", () => {
        describe("when token is not eth address", () => {
          describe("when there is no partner service", () => {
            it("should deposit directly into a yearn vault", async () => {
              const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xToken" });
              vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);

              const populateDepositTransactionMock = jest.fn().mockResolvedValue("trx");
              (vaultInterface as any).populateDepositTransaction = populateDepositTransactionMock;

              const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

              await vaultInterface.deposit(vault, token, amount, account);

              expect(Contract).not.toHaveBeenCalled();
              expect(populateDepositTransactionMock).toHaveBeenCalledTimes(1);
              expect(partnerPopulateDepositTransactionMock).not.toHaveBeenCalled();
              expect(sendTransactionUsingServiceMock).toHaveBeenCalledTimes(1);
              expect(sendTransactionUsingServiceMock).toBeCalledWith("trx");
            });
          });

          describe("when there is partner service", () => {
            it("should deposit into a yearn vault through the partner service", async () => {
              mockedYearn = new (Yearn as jest.Mock<Yearn<ChainId>>)();
              mockedYearn.services.partner = new (PartnerService as unknown as jest.Mock<PartnerService<ChainId>>)();
              mockedYearn.services.partner.populateDepositTransaction = jest.fn().mockResolvedValue({
                vault: "0xVault",
                amount: "1",
              });
              vaultInterface = new VaultInterface(mockedYearn, 1, new Context({}));
              const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xToken" });
              vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);

              const executeVaultContractTransactionMock = jest.fn().mockImplementation((fn) => fn());
              (vaultInterface as any).executeVaultContractTransaction = executeVaultContractTransactionMock;

              const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

              await vaultInterface.deposit(vault, token, amount, account);

              expect(mockedYearn.services.partner.populateDepositTransaction).toHaveBeenCalledTimes(1);
              expect(mockedYearn.services.partner.populateDepositTransaction).toHaveBeenCalledWith("0xVault", "1", {});
            });
          });
        });
      });

      describe("when vault ref token is not the same as the token", () => {
        it("should call zapIn with correct arguments and yearn as the zapProtocol", async () => {
          const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xRandom" });
          vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);

          const zapInMock = jest.fn();
          (vaultInterface as any).zapIn = zapInMock;

          const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

          await vaultInterface.deposit(vault, token, amount, account);

          expect(zapInMock).toHaveBeenCalledTimes(1);
          expect(zapInMock).toHaveBeenCalledWith(vault, token, amount, account, {}, ZapProtocol.YEARN, {});
        });

        it("should call zapIn with correct arguments and yearn as the zapProtocol and the partner id", async () => {
          mockedYearn = new (Yearn as jest.Mock<Yearn<ChainId>>)();
          mockedYearn.services.partner = new (PartnerService as unknown as jest.Mock<PartnerService<ChainId>>)();
          vaultInterface = new VaultInterface(mockedYearn, 1, new Context({}));
          const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xRandom" });
          vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);

          const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

          await vaultInterface.deposit(vault, token, amount, account, { slippage: 0.1 });

          expect(portalsZapInMock).toHaveBeenCalledTimes(1);
          expect(portalsZapInMock).toHaveBeenCalledWith(
            "0xVault",
            "0xToken",
            "1",
            "0xAccount",
            0.1,
            true,
            "0x000partner"
          );
        });
      });
    });
  });

  describe("withdraw", () => {
    describe("when vault ref token is the same as the token given", () => {
      beforeEach(() => {
        const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xToken" });
        vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);
      });

      it("should withdraw from a yearn vault", async () => {
        const populateWithdrawTransactionMock = jest.fn().mockResolvedValue("trx");
        (vaultInterface as any).populateWithdrawTransaction = populateWithdrawTransactionMock;

        const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

        await vaultInterface.withdraw(vault, token, amount, account);

        expect(Contract).not.toHaveBeenCalled();
        expect(populateWithdrawTransactionMock).toHaveBeenCalledTimes(1);
        expect(sendTransactionUsingServiceMock).toHaveBeenCalledTimes(1);
        expect(sendTransactionUsingServiceMock).toBeCalledWith("trx");
      });
    });

    describe("when vault ref token is not the same as the token given", () => {
      beforeEach(() => {
        const assetStaticVaultV2 = createMockAssetStaticVaultV2({ token: "0xRandom" });
        vaultInterface.getStatic = jest.fn().mockResolvedValue([assetStaticVaultV2]);
      });

      describe("when slippage is provided as an option", () => {
        it("should call zapOut with correct arguments and pickle as the zapProtocol", async () => {
          const populateWithdrawTransactionMock = jest.fn().mockResolvedValue("populateWithdrawTransactionResponse");
          (vaultInterface as any).populateWithdrawTransaction = populateWithdrawTransactionMock;

          const [vault, token, amount, account] = ["0xVault", "0xToken", "1", "0xAccount"];

          await vaultInterface.withdraw(vault, token, amount, account, { slippage: 1 });

          expect(sendTransactionUsingServiceMock).toHaveBeenCalledTimes(1);
          expect(sendTransactionUsingServiceMock).toBeCalledWith("populateWithdrawTransactionResponse");
          expect(populateWithdrawTransactionMock).toHaveBeenCalledTimes(1);
        });
      });

      describe("when slippage is not provided as an option", () => {
        it("should throw", async () => {
          try {
            await vaultInterface.withdraw("0xVault", "0xToken", "1", "0xAccount", { slippage: undefined });
          } catch (error) {
            expect(error).toStrictEqual(new SdkError("zap operations should have a slippage set"));
          }
        });
      });
    });
  });

  describe("getInfo", () => {
    it("should return values from property aggregator", async () => {
      const lastReportTimestamp = 1653392108;
      const lastReportDate = new Date(lastReportTimestamp * 1000);

      const name = "name";
      const symbol = "symbol";
      const apiVersion = "0.3.5";
      const emergencyShutdown = false;
      const managementFee = BigNumber.from(200);
      const performanceFee = BigNumber.from(2000);
      const totalAssets = BigNumber.from(123);
      const depositLimit = BigNumber.from(456);
      const debtRatio = BigNumber.from(10000);
      const management = "0x727fe1759430df13655ddb0731dE0D0FDE929b04";
      const governance = "0xC0E2830724C946a6748dDFE09753613cd38f6767";
      const guardian = "0x72a34AbafAB09b15E7191822A679f28E067C4a16";
      const rewards = "0x89716Ad7EDC3be3B35695789C475F3e7A3Deb12a";

      const propertiesAggregatorReturnValue = {
        lastReport: BigNumber.from(lastReportTimestamp),
        name,
        symbol,
        apiVersion,
        emergencyShutdown,
        managementFee,
        performanceFee,
        totalAssets,
        depositLimit,
        debtRatio,
        management,
        governance,
        guardian,
        rewards,
      };

      propertiesAggregatorGetPropertiesMock.mockReturnValue(propertiesAggregatorReturnValue);

      const result = await vaultInterface.getInfo("0x1e2fe8074a5ce1Bb7394856B0C618E75D823B93b");
      expect(result.lastReport).toEqual(lastReportDate);
      expect(result.name).toEqual(name);
      expect(result.symbol).toEqual(symbol);
      expect(result.apiVersion).toEqual(apiVersion);
      expect(result.emergencyShutdown).toEqual(emergencyShutdown);
      expect(result.managementFee).toEqual(managementFee);
      expect(result.performanceFee).toEqual(performanceFee);
      expect(result.totalAssets).toEqual(totalAssets);
      expect(result.depositLimit).toEqual(depositLimit);
      expect(result.debtRatio).toEqual(debtRatio);
      expect(result.management).toEqual(management);
      expect(result.governance).toEqual(governance);
      expect(result.guardian).toEqual(guardian);
      expect(result.rewards).toEqual(rewards);
    });
  });
});
