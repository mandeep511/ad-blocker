export interface FilterList {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  bundledPath?: string;
}

export const FILTER_LISTS: FilterList[] = [
  {
    id: 'easylist',
    name: 'EasyList',
    url: 'https://easylist.to/easylist/easylist.txt',
    enabled: true,
    bundledPath: 'bundled/easylist.txt',
  },
  {
    id: 'easyprivacy',
    name: 'EasyPrivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    enabled: true,
    bundledPath: 'bundled/easyprivacy.txt',
  },
  {
    id: 'ublock-ads',
    name: 'uBlock Filters — Ads',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    enabled: true,
    bundledPath: 'bundled/ublock-ads.txt',
  },
  {
    id: 'ublock-privacy',
    name: 'uBlock Filters — Privacy',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
    enabled: true,
  },
  {
    id: 'peter-lowe',
    name: "Peter Lowe's Ad Server List",
    url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
    enabled: true,
  },
];

export function getEnabledLists(): FilterList[] {
  return FILTER_LISTS.filter((l) => l.enabled);
}
