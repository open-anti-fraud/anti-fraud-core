from dataclasses import dataclass
from enum import Enum
from typing import List, Tuple, Optional, Dict

from integration.metrics import VrMetrics
from utils import Singleton


class MetricType(Enum):
    gauge = 0
    average = 1

@dataclass
class MetricInfo:
    type: MetricType
    description: str

@dataclass
class GaugeMetric(MetricInfo):
    gauge: float

@dataclass
class AverageMetric(MetricInfo):
    numerator: float
    denominator: int


class MetricsManager(metaclass=Singleton):
    def __init__(self, metrics_list: List[Tuple[str,str,MetricType]]):
        self.gauge_metrics: Dict[str, GaugeMetric] = {}
        self.average_metrics: Dict[str, AverageMetric] = {}

        for name, description, type_ in metrics_list:
            if type_ == MetricType.gauge:
                self.gauge_metrics[name] = GaugeMetric(
                    type=type_,
                    description=description,
                    gauge=0
                )
            elif type_ == MetricType.average:
                self.average_metrics[name] = AverageMetric(
                    type=type_,
                    description=description,
                    numerator=0,
                    denominator=0
                )
            else:
                raise Exception("unknown metric type")

    def update_gauge_metric(self, metric_name: str, value: Optional[float]):
        try:
            metric_info = self.gauge_metrics[metric_name]
        except KeyError:
            raise Exception("Wrong metric name or metric type is not gauge")

        metric_info.gauge += value

    def update_average_metric(self, metric_name: str, numerator: Optional[float], denominator: Optional[int] = 1):
        try:
            metric_info = self.average_metrics[metric_name]
        except KeyError:
            raise Exception("Wrong metric name or metric type is not average")

        metric_numerator = metric_info.numerator
        metric_denominator = metric_info.denominator

        # flap metric to not leak memory
        if metric_numerator >= 1_000_000 or metric_denominator >= 1_000_000:
            metric_numerator = metric_numerator / metric_denominator
            metric_denominator = 1

        metric_numerator += numerator
        metric_denominator += denominator

        metric_info.numerator = metric_numerator
        metric_info.denominator = metric_denominator

    def form_prometheus_format(self) -> str:
        string_list = []

        for name, metric_info in self.gauge_metrics.items():
            string_list.append(f"# HELP {name} {metric_info.description}\n")
            string_list.append(f"# TYPE {name} gauge\n")
            string_list.append(f"{name} {metric_info.gauge}\n")

        for name, metric_info in self.average_metrics.items():
            string_list.append(f"# HELP {name} {metric_info.description}\n")
            string_list.append(f"# TYPE {name} gauge\n")
            string_list.append(
                f"{name} {metric_info.numerator / metric_info.denominator if metric_info.denominator != 0 else 0}\n"
            )

        return ''.join(string_list)

def get_metrics_manager():
    return MetricsManager([
        (VrMetrics.WebsocketConnectionCount.value, "Number current websocket connections", MetricType.gauge),
        (VrMetrics.WebsocketAverageConnectionDuration.value, "Average websocket connection duration", MetricType.average),
        (VrMetrics.WebsocketAverageVideoChunkSize.value,
         "Average video chunk size witch transferred via websocket",
         MetricType.average),
    ])
