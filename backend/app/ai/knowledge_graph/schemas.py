from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    entity_type: str
    entity_id: int


class GraphRelationship(BaseModel):
    source: str
    target: str
    relationship: str


class KnowledgeGraphResponse(BaseModel):
    entity_type: str
    entity_id: int
    nodes: list[GraphNode]
    relationships: list[GraphRelationship]