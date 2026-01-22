import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  DndContext,
  useDroppable,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import SortableItem from "./SortableItem";
import "./SortableComponent.css";

type Direction = "horizontal" | "vertical";

interface ContainerDescription {
  header: string;
  items: string[];
}

interface StreamlitArguments {
  direction?: Direction;
  items: ContainerDescription[];
  customStyle?: string;
  returnEvents?: boolean;
}

interface ContainerProps {
  header: string;
  items: string[];
  direction?: Direction;
  width?: number;
  children?: ReactNode;
}

function Container(props: ContainerProps) {
  const { setNodeRef } = useDroppable({ id: props.header });

  return (
    <div className="sortable-container" ref={setNodeRef} style={{ width: props.width }}>
      {props.header ? (
        <div className="sortable-container-header">{props.header}</div>
      ) : null}

      <SortableContext id={props.header} items={props.items} strategy={rectSortingStrategy}>
        <div className="sortable-container-body">{props.children}</div>
      </SortableContext>
    </div>
  );
}

interface SortableComponentProps {
  direction?: Direction;
  items: ContainerDescription[];
  returnEvents?: boolean;
}

function SortableComponent(props: SortableComponentProps) {
  const [items, setItems] = useState<ContainerDescription[]>(props.items);
  const [clonedItems, setClonedItems] = useState<ContainerDescription[]>(props.items);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragTimeoutRef = useRef<number | null>(null);

  // keep state in sync if Streamlit updates items
  useEffect(() => {
    setItems(props.items);
    setClonedItems(props.items);
  }, [props.items]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function scheduleDragReset() {
    if (dragTimeoutRef.current !== null) window.clearTimeout(dragTimeoutRef.current);
    dragTimeoutRef.current = window.setTimeout(() => {
      setIsDragging(false);
      dragTimeoutRef.current = null;
    }, 150);
  }

  function findContainer(itemId: string) {
    const containerIndex = items.findIndex(({ header }) => header === itemId);
    if (containerIndex >= 0) return containerIndex;
    return items.findIndex(({ items }) => items.includes(itemId));
  }

  function isSameOrder(a: ContainerDescription[], b: ContainerDescription[]) {
    if (a.length !== b.length) return false;
    return a.every((c, i) => {
      const d = b[i];
      if (!d || c.header !== d.header) return false;
      if (c.items.length !== d.items.length) return false;
      return c.items.every((id, j) => id === d.items[j]);
    });
  }

  function handleDragStart(event: any) {
    if (dragTimeoutRef.current !== null) {
      window.clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    setIsDragging(true);
    setActiveItem(event.active?.id ?? null);
    setClonedItems(items);
  }

  function handleDragCancel() {
    setActiveItem(null);
    setItems(clonedItems);
    scheduleDragReset();
  }

  function handleDragEnd(event: any) {
    setActiveItem(null);
    scheduleDragReset();

    const { active, over } = event;
    if (!over) return;

    const activeContainerIndex = findContainer(active.id);
    const overContainerIndex = findContainer(over.id);
    if (activeContainerIndex < 0 || overContainerIndex < 0) return;

    // same container reorder
    if (activeContainerIndex === overContainerIndex) {
      const container = items[activeContainerIndex];
      const activeIdx = container.items.indexOf(active.id);
      const overIdx = container.items.indexOf(over.id);
      if (activeIdx < 0 || overIdx < 0) return;

      const newItems = items.map((c, idx) =>
        idx === activeContainerIndex ? { header: c.header, items: arrayMove(c.items, activeIdx, overIdx) } : c
      );

      setItems(newItems);

      if (!isSameOrder(clonedItems, newItems)) {
        Streamlit.setComponentValue(newItems);
        Streamlit.setFrameHeight();
      }
    }
  }

  function handleDragOver(event: any) {
    const { active, over } = event;
    if (!over) return;

    const activeContainerIndex = findContainer(active.id);
    const overContainerIndex = findContainer(over.id);
    if (activeContainerIndex < 0 || overContainerIndex < 0) return;

    if (activeContainerIndex === overContainerIndex) return;

    const source = items[activeContainerIndex];
    const target = items[overContainerIndex];

    const activeIdx = source.items.indexOf(active.id);
    if (activeIdx < 0) return;

    const activeVal = source.items[activeIdx];

    const overIdx = target.items.indexOf(over.id);
    const insertAt = overIdx >= 0 ? overIdx : target.items.length;

    const newItems = items.map((c, idx) => {
      if (idx === activeContainerIndex) {
        return { header: c.header, items: c.items.filter((x) => x !== activeVal) };
      }
      if (idx === overContainerIndex) {
        const next = [...c.items];
        next.splice(insertAt, 0, activeVal);
        return { header: c.header, items: next };
      }
      return c;
    });

    setItems(newItems);
  }

  function handleItemClick(header: string, item: string) {
    if (isDragging || !props.returnEvents) return;

    Streamlit.setComponentValue({
      event: "click",
      header,
      item,
      containers: items,
    });
    Streamlit.setFrameHeight();
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {items.map(({ header, items }) => (
        <Container key={header} header={header} items={items} direction={props.direction}>
          {items.map((item) => (
            <SortableItem
              key={item}
              id={item}
              isActive={item === activeItem}
              onClick={() => handleItemClick(header, item)}
            >
              {item}
            </SortableItem>
          ))}
        </Container>
      ))}

      <DragOverlay>
        <SortableItem id="__overlay__" isOverlay={true}>
          {activeItem}
        </SortableItem>
      </DragOverlay>
    </DndContext>
  );
}

function SortableComponentWrapper(props: ComponentProps) {
  const args = props.args as StreamlitArguments;

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  return (
    <div className={`sortable-component ${args.direction || ""}`}>
      <style>{args.customStyle}</style>
      <SortableComponent
        items={args.items}
        direction={args.direction}
        returnEvents={args.returnEvents}
      />
    </div>
  );
}

export default withStreamlitConnection(SortableComponentWrapper);

