import { default as ConfigurationFromServer } from './class';

export default function configurationMergerFactory() {
    return new ConfigurationFromServer();
}
