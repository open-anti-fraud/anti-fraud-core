import API from 'tdvc';
import EndeavorDatabaseAPI from './class';

export default function endeavorDatabaseApiFactory(api: API) {
    return new EndeavorDatabaseAPI(api);
}
