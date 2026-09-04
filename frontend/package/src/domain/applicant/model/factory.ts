import Applicant, { ApplicantProps } from './class';

export default function applicantFactory(props: ApplicantProps) {
    return new Applicant(props);
}
