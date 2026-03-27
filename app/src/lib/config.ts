export const config = {
  dataBaseUrl:
    process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "https://apps.dashify.com.au/milo/data",
  ajaxBaseUrl:
    process.env.NEXT_PUBLIC_AJAX_BASE_URL ?? "https://apps.dashify.com.au/milo/ajax",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://apps.dashify.com.au/milo/api"
};

