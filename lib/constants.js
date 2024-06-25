import { IMPLEMENTATION_ABI } from "./abiAccount.js";
import { REGISTRY_ABI } from "./abiRegistry.js";

export const TOKENBOUND = {
    mainnet: {
        registryAbi: REGISTRY_ABI,
        registryAddress: "TDL8TKzyQiXgciKGgEhncWaGWggfALU4U5",
        accountImplementationAbi: IMPLEMENTATION_ABI,
        accountImplementationAddress: "TVTVbudvqsMfjJeQtajt9zBSurw1NBMPKD",
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    shasta: {
        registryAbi: REGISTRY_ABI,
        registryAddress: "TTUzKaqq6NDtd31DR37VS9MmQADXDgsUvg",
        accountImplementationAbi: IMPLEMENTATION_ABI,
        accountImplementationAddress: "TXzmEzD2UqYAUaPWYRTZMGVpF2pvGUu2CK",
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    nile: {
        registryAbi: REGISTRY_ABI,
        registryAddress: "TE4xFtwAikSNhVpk7DcDXzooEBhy2eXE3i",
        accountImplementationAbi: IMPLEMENTATION_ABI,
        accountImplementationAddress: "TYUBDqFuVxcxEJAYhC7FwwTrtffijWq6vh",
        salt: "0x1000000000000000000000000000000000000000000000000000000000000000",
    },
};
