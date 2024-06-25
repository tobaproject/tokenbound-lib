import axios from "axios";
import TronWeb from "tronweb";
import { NETWORKS } from "./networks.js";
import { TOKENBOUND } from "./constants.js";

var networkId = "nile"; // values: nile, shasta, mainnet

export function setNetwork(_networkId = "nile") {
    networkId = _networkId;
}

function getHostNetwork() {
    return NETWORKS[networkId];
}

// Helper Methods
function useTronWeb() {
    const { id, trongridBaseAPI } = getHostNetwork();
    const options = {
        fullHost: trongridBaseAPI,
        privateKey: "79DCBCB07564D97FA4675C57EF2ED926727C7EB8785456AB1AEA0BA74AF3252C" //"process.env.NEXT_PUBLIC_TRONGRID_PK",
    };

    if (id === "mainnet")
        options.headers = {
            "TRON-PRO-API-KEY": "process.env.NEXT_PUBLIC_TRONGRID_KEY",
        };

    return new TronWeb(options);
}

function formatAssetDataFromTronscan(data) {
    const type =
        data.tokenType === "trc721" ? "NON_FUNGIBLE_UNIQUE" : "FUNGIBLE_COMMON";

    return {
        type,
        name: data.tokenName,
        symbol: data.tokenAbbr,
        address: data.tokenId,
        decimals: data.tokenDecimal,
        balance: data.quantity, //data.balance(evm str)
        standard: data.tokenType,
        thumb: data.tokenLogo,
    };
}

async function getAccountTokensList(address) {
    let response = null;
    const { tronscanBaseAPI } = getHostNetwork();

    try {
        const res = await axios.get(
            `${tronscanBaseAPI}/api/account/tokens?address=${address}`
        );
        response = res.data;
    } catch (err) {
        const {
            message,
            response: { status },
        } = err;
        console.log(
            `request error in %c ${"getAccountTokensREST"}`,
            "font-weight:900"
        );
        console.log(status, message);
    }

    return response;
}

async function getAccountTokensDetail(tokens, holderAddr) {
    // format nfts array to iterate easely over it
    const filterNfts = tokens
        .filter((t) => t.type === "NON_FUNGIBLE_UNIQUE")
        .map(({ address, balance }) => {
            const arr = Array(balance).fill(0);
            return arr.map((n, index) => ({ address, index }));
        })
        .flat();

    const reqNftInfos = filterNfts.map((t) =>
        getNftInfoByOwnerIndex(t.address, holderAddr, t.index)
    );
    const nftInfos = await Promise.all(reqNftInfos);

    const accountNfts = nftInfos.map((t) => {
        const { name, symbol, type } = tokens.find(
            (i) => t.address === i.address
        );
        return { name, symbol, type, ...t };
    });

    return {
        accountTokens: tokens.filter((t) => t.type === "FUNGIBLE_COMMON"),
        accountNfts,
    };
}

async function getNftInfoByOwnerIndex(contractAddr, holderAddr, index) {
    let tronWeb = useTronWeb();
    let contract = await tronWeb.contract().at(contractAddr);
    try {
        let tokenId = await contract
            .tokenOfOwnerByIndex(holderAddr, index)
            .call();
        let _tokenId = Array.isArray(tokenId) ? tokenId[0] : tokenId; // check for tupples
        let tokenUri = await contract.tokenURI(_tokenId).call();
        let metadata = {};

        if (tokenUri.startsWith("http") || tokenUri.startsWith("ipfs")) {
            let _tokenUri = tokenUri.startsWith("ipfs")
                ? tokenUri.replace("ipfs://", "https://ipfs.io/ipfs/")
                : tokenUri;
            try {
                metadata = await (await fetch(_tokenUri)).json();
            } catch (error) {
                console.log("error getting metadata");
            }
        } else {
            // this case should be an IPFS CID
        }

        return {
            address: contractAddr,
            tokenId: tokenId.toString(),
            tokenUri,
            metadata,
        };
    } catch (error) {
        console.log("error getting nft", error);
        return {
            address: contractAddr,
            tokenId: 0,
            tokenUri: "",
            metadata: {},
        };
    }
}

export async function getEncodedFunctionData(contractAddress, func, parameters) {
    let tronWeb = useTronWeb();
    try {
        const { transaction } =
            await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress,
                func,
                {},
                parameters
            );

        const data = transaction.raw_data.contract[0].parameter.value.data;

        return `0x${data}`;
    } catch (error) {
        console.log(error, { contractAddress, func, parameters });
        return "";
    }
}

// Tokenbound Methods
export async function tbaGetAssets(tbaAddress) {
    const accountAssets = await getAccountTokensList(tbaAddress);
    const assetsData = accountAssets.data
        .map((o) => formatAssetDataFromTronscan(o))
        .filter((t) => t.address !== "_");

    const { accountNfts, accountTokens } = await getAccountTokensDetail(
        assetsData,
        tbaAddress
    );
    const balance = accountAssets.data[0].quantity;

    return {
        balance,
        assets: accountTokens,
        collectibles: accountNfts,
    };
}

export async function tbaGetOwner(tbaAddress) {
    const { id: networkId } = getHostNetwork();
    const { accountImplementationAbi } = TOKENBOUND[networkId];

    let tronWeb = useTronWeb();
    const contract = await tronWeb.contract(
        accountImplementationAbi,
        tbaAddress
    );
    try {
        const owner = await contract.owner().call();
        return tronWeb.address.fromHex(owner);
    } catch (error) {
        console.log("smartcontract error", error);
        return null;
    }
}

export async function tbaGetAddress(tokenContract, tokenId) {
    const { id: networkId, chainId } = getHostNetwork();
    const { salt, registryAbi, registryAddress, accountImplementationAddress } =
        TOKENBOUND[networkId];

    let tronWeb = useTronWeb();
    const contract = await tronWeb.contract(registryAbi, registryAddress);
    const tid = `${tokenContract}_${tokenId}`;

    try {
        const address = await contract
            .account(
                accountImplementationAddress,
                salt,
                chainId,
                tokenContract,
                tokenId
            )
            .call();

        const addressBase58 = tronWeb.address.fromHex(address);

        // verifies if there's a tba deployment for this account
        const deployment = await tronWeb.trx.getContract(addressBase58);
        const isDeployed = Object.keys(deployment).length > 0;

        return {
            address: addressBase58,
            isDeployed,
            tid,
        };
    } catch (error) {
        console.log("smartcontract error", error);
        return {
            account: null,
            isDeployed: false,
            tid,
        };
    }
}

export async function tbaCreateAccount(tokenContract, tokenId) {
    const { id: networkId, chainId } = getHostNetwork();
    const { salt, registryAbi, registryAddress, accountImplementationAddress } =
        TOKENBOUND[networkId];

    const tweb = window.tronLink.tronWeb;
    const contract = await tweb.contract(registryAbi, registryAddress);

    try {
        const address = await contract
            .createAccount(
                accountImplementationAddress,
                salt,
                chainId,
                tokenContract,
                tokenId
            )
            .send({
                feeLimit: 1_000_000_000,
            });

        const addressBase58 = tronWeb.address.fromHex(address);
        return addressBase58;
    } catch (error) {
        console.log("smartcontract error", error);
        return null;
    }
}

export async function tbaExecute(to, value, data, tbaAddress) {
    const { id: networkId } = getHostNetwork();
    const { accountImplementationAbi } = TOKENBOUND[networkId];

    const tweb = window.tronLink.tronWeb;
    const contract = await tweb.contract(accountImplementationAbi, tbaAddress);

    try {
        const operation = 0; // CALL
        const result = await contract.execute(to, value, data, operation).send({
            feeLimit: 1_000_000_000,
        });

        return {
            result,
            transactionId: result,
            err: false,
        };
    } catch (error) {
        console.log("smartcontract error", error);
        return {
            err: true,
        };
    }
}
