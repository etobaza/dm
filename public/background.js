const ROBLOX_API_BASE = "https://apis.roblox.com";

async function fetchRobloxApi(path, options = {}) {
  const url = `${ROBLOX_API_BASE}${path}`;
  const defaultOptions = { credentials: "include" };

  try {
    let response = await fetch(url, { ...defaultOptions, ...options });

    if (response.status === 403 && response.headers.get("x-csrf-token")) {
      const csrfToken = response.headers.get("x-csrf-token");
      response = await fetch(url, {
        ...defaultOptions,
        ...options,
        headers: {
          ...options.headers,
          "x-csrf-token": csrfToken,
        },
      });
    }

    if (!response.ok) {
      const error = {
        status: response.status,
        message: `HTTP Error: ${response.status}`,
      };
      if (response.status === 401)
        error.message =
          "Unauthorized. Ensure you are logged into create.roblox.com in Chrome.";
      if (response.status === 403)
        error.message = "Forbidden. You may not have permission.";
      throw error;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw error.message && error.status
      ? error
      : { message: error.message || "An unknown error occurred", status: 500 };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleRequest = async () => {
    switch (request.type) {
      // List developer products.
      // New API (2026): universe-scoped path + pageSize/pageToken paging.
      // Response wrapper key is now `developerProducts` (was `developerProductsOverview`).
      case "FETCH_PRODUCTS": {
        const { universeId, limit = 400 } = request;
        if (!universeId)
          throw { message: "Universe ID is required", status: 400 };
        return fetchRobloxApi(
          `/developer-products/v2/universes/${universeId}/developer-products/creator?pageSize=${limit}&pageToken=`
        );
      }

      // Update developer product.
      // New API (2026): PATCH the single product (productId IS in the v2 path) with a
      // multipart/form-data body carrying the FULL desired state — the same field set
      // as create, plus storePageEnabled. HAR-confirmed (devproductgamepass2.har); 204 on success.
      case "UPDATE_PRODUCT_PRICE": {
        const { universeId: uid, productId, productData } = request;
        if (!uid || !productId)
          throw {
            message: "Universe ID and Product ID are required",
            status: 400,
          };

        const hasPrice =
          productData.priceInRobux !== null &&
          productData.priceInRobux !== undefined;

        const formData = new FormData();
        formData.append("name", productData.name);
        formData.append("description", productData.description || "");
        formData.append("isForSale", String(hasPrice));
        if (hasPrice) formData.append("price", String(productData.priceInRobux));
        formData.append(
          "isRegionalPricingEnabled",
          String(productData.isRegionalPricingEnabled)
        );
        formData.append(
          "storePageEnabled",
          String(productData.storePageEnabled)
        );

        return fetchRobloxApi(
          `/developer-products/v2/universes/${uid}/developer-products/${productId}`,
          {
            method: "PATCH",
            body: formData,
          }
        );
      }

      // Create developer product.
      // New API (2026): v2 universe-scoped POST with multipart/form-data
      // (was v1 with query-string params). Price field renamed priceInRobux -> price,
      // plus new isForSale + imageFile fields.
      case "CREATE_PRODUCT": {
        const { universeId: createUid, productData: createData } = request;
        if (!createUid)
          throw { message: "Universe ID is required", status: 400 };

        const hasPrice =
          createData.priceInRobux !== null &&
          createData.priceInRobux !== undefined;

        const formData = new FormData();
        formData.append("name", createData.name);
        formData.append("description", createData.description || "");
        formData.append("isForSale", String(hasPrice));
        if (hasPrice) formData.append("price", String(createData.priceInRobux));
        formData.append("imageFile", "null");
        formData.append(
          "isRegionalPricingEnabled",
          String(createData.isRegionalPricingEnabled)
        );

        return fetchRobloxApi(
          `/developer-products/v2/universes/${createUid}/developer-products`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      // List game passes.
      // New API (2026): universe-scoped path + pageSize paging (was `count`).
      case "FETCH_GAMEPASSES": {
        const { universeId, count = 400 } = request;
        if (!universeId)
          throw { message: "Universe ID is required", status: 400 };
        return fetchRobloxApi(
          `/game-passes/v1/universes/${universeId}/game-passes/creator?pageSize=${count}`
        );
      }

      // Create game pass.
      // New API (2026): universe-scoped POST; universeId moved into the path
      // (was a form field), imageFile field added.
      case "CREATE_GAMEPASS": {
        const { universeId, name, description } = request;
        if (!universeId || !name)
          throw { message: "Universe ID and Name are required", status: 400 };

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description || "");
        formData.append("imageFile", "null");

        return fetchRobloxApi(
          `/game-passes/v1/universes/${universeId}/game-passes`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      // Update game pass.
      // New API (2026): PATCH universe-scoped path (was POST .../{id}/details).
      // universeId is now REQUIRED in the path. Responds 204 No Content.
      case "UPDATE_GAMEPASS": {
        const {
          gamePassId,
          universeId,
          isForSale,
          price,
          isRegionalPricingEnabled,
          name,
        } = request;
        if (!gamePassId)
          throw { message: "Game Pass ID is required", status: 400 };
        if (!universeId)
          throw { message: "Universe ID is required", status: 400 };

        const formData = new FormData();

        if (name !== undefined) {
          formData.append("name", name);
        }

        if (isForSale !== undefined) {
          formData.append("isForSale", String(isForSale));
        }

        if (price !== undefined && price !== null) {
          formData.append("price", String(price));
        }

        if (isRegionalPricingEnabled !== undefined) {
          formData.append(
            "isRegionalPricingEnabled",
            String(isRegionalPricingEnabled)
          );
        } else if (isForSale !== undefined) {
          formData.append("isRegionalPricingEnabled", "true");
        }

        return fetchRobloxApi(
          `/game-passes/v1/universes/${universeId}/game-passes/${gamePassId}`,
          {
            method: "PATCH",
            body: formData,
          }
        );
      }

      case "GET_ACTIVE_TAB_URL": {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        return { url: tab?.url || "" };
      }

      default:
        return;
    }
  };

  if (
    [
      "FETCH_PRODUCTS",
      "UPDATE_PRODUCT_PRICE",
      "CREATE_PRODUCT",
      "FETCH_GAMEPASSES",
      "CREATE_GAMEPASS",
      "UPDATE_GAMEPASS",
      "GET_ACTIVE_TAB_URL",
    ].includes(request.type)
  ) {
    handleRequest()
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message, status: err.status }));
    return true;
  }
});
