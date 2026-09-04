import { InspectionsTransportProps } from '../inspections_transport';
import InspectionsWebSocketTransport from './class';

export default function inspectionsWebSocketTransportFactory(props: InspectionsTransportProps) {
    return new InspectionsWebSocketTransport(props);
}
