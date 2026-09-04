from dataclasses import field, dataclass
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from core.business_logic.interface.cpu_commands_interface import CPUCommandsInterface
from core.business_logic.types import ContentInfo


@dataclass
class MessageHandlingContext:
    endeavor_id: UUID
    aggregate_entity_id: UUID
    cpu_commands: CPUCommandsInterface
    content: List[ContentInfo] = field(default_factory=list)
