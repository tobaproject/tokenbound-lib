import { tbaGetAddress, tbaGetAssets, tbaGetOwner, setNetwork }  from "./lib/index.js";

async function init() {
    const nftContractAddress = "TNJYzc441rr4u315ABYzNN5MZ8ExjAfqLV";
    const nftId = 2

    setNetwork("nile")

    // get the tba for this collectible
    const tba = await tbaGetAddress(nftContractAddress, nftId);
    console.log("Account address: ", tba);

    // whos the owner of that nft?
    const owner = await tbaGetOwner(tba.address);
    console.log("NFT owner: ", owner);

    // let's get the assets owned by the tba
    const assets = await tbaGetAssets("Assets: ",tba.address);
    console.log(assets);
}

init();