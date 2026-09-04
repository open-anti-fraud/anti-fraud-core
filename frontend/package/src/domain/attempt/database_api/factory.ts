import API from 'tdvc';
import AttemptDatabaseAPI from './class';

export default function attemptDatabaseApiFactory(api: API) {
    return new AttemptDatabaseAPI(api);
}
