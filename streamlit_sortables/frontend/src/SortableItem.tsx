import React, { ReactNode, FunctionComponent, MouseEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import "./SortableComponent.css";

export interface SortableItemProps {
  id: string;
  isActive?: boolean;
  children?: ReactNode;
  isOverlay?: boolean;
  onClick?: () => void;
}

const SortableItem: FunctionComponent<SortableItemProps> = (props) => {
  const overlay = !!props.isOverlay;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const style: React.CSSProperties = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    cursor: overlay ? "grabbing" : "default",
  };

  const className = `btn shadow-none sortable-item ${
    props.isActive ? "active" : ""
  } ${isDragging ? "dragging" : ""}`;

  const stop = (e: MouseEvent) => e.stopPropagation();

  const handleCardClick = () => {
    if (overlay || isDragging) return;
    props.onClick?.();
  };

  return (
    <li className={className} ref={setNodeRef} style={style}>
      {!overlay && (
        <span
          className="drag-handle cc-handle"
          ref={setActivatorNodeRef}
          onClick={stop}
          title="Drag"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </span>
      )}

      <div className="item-content" onClick={handleCardClick}>
        {props.children ?? null}
      </div>
    </li>
  );
};

export default SortableItem;
