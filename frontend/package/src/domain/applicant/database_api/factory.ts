import API from 'tdvc';
import ApplicantDatabaseAPI from './class';

export default function applicantDatabaseApiFactory(api: API) {
    return new ApplicantDatabaseAPI(api);
}
