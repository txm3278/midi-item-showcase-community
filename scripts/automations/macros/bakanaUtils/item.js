function  setPreUseItemConfig(item, cfgs, opts) {
    const useHookId = Hooks.on("dnd5e.preUseItem", (hookItem, config, options) => {
        if (hookItem !== item) return;
        for (let key of Object.keys(opts))
            options[key] = opts[key];
        for (let key of Object.keys(cfgs))
            config[key] = cfgs[key];

        if (macroUtil.debugLevel < 0) {
            console.warn("Set preUseItem config:", config);
            console.warn("Set preUseItem options:", options);
        }
        Hooks.off("dnd5e.preUseItem", useHookId);
    });
}

export const itemApi = { setPreUseItemConfig };
