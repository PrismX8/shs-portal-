(() => {
    const uvPfx = "/uv/";
    let loc = "";
    const scriptPath =
        typeof document !== "undefined" &&
        document.currentScript &&
        document.currentScript.src
            ? new URL(document.currentScript.src).pathname
            : "";

    if (scriptPath && scriptPath.includes(uvPfx)) {
        loc = scriptPath.substring(0, scriptPath.indexOf(uvPfx));
    } else if (self.location.pathname.includes(uvPfx)) {
        loc = self.location.pathname.substring(
            0,
            self.location.pathname.indexOf(uvPfx)
        );
    } else {
        loc = self.location.pathname.substring(
            0,
            self.location.pathname.lastIndexOf("/")
        );
    }

    const origin =
        typeof self !== "undefined" && self.location ? self.location.origin : "";

    self.__uv$config = {
        prefix: loc + uvPfx + "service/",
        bare: origin + loc + "/bare/",
        encodeUrl: Ultraviolet.codec.xor.encode,
        decodeUrl: Ultraviolet.codec.xor.decode,
        handler: loc + uvPfx + "uv.handler.js",
        client: loc + uvPfx + "uv.client.js",
        bundle: loc + uvPfx + "uv.bundle.js",
        config: loc + uvPfx + "uv.config.js",
        sw: loc + uvPfx + "uv.sw.js",
        loc: loc,
    };
})();
