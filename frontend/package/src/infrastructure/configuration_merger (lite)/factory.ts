import { default as LiteConfigurationFromServer } from './class';

export default function liteConfigurationMergerFactory() {
    return new LiteConfigurationFromServer();
}
