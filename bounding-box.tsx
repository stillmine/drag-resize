import styled from '@emotion/styled';
import * as React from 'react';
import { Component, RefObject, createRef } from 'react';

function boxBackground({ isMovable }) {
  return isMovable ? 'rgba(255, 255, 255, 0.4)' : 'transparent';
}

function boxBorder({ isMovable, isRejected }) {
  if (!isMovable && isRejected) {
    return 'solid #ff5869';
  }

  if (!isMovable) {
    return 'solid #00a3e0';
  }

  return `dashed #333`;
}

const BoxWrapper = styled.div<{
  height: number;
  isMovable: boolean;
  width: number;
  x: number;
  y: number;
}>`
  background-color: ${boxBackground};
  border: 3px ${boxBorder};
  cursor: ${({ isMovable }) => (isMovable ? 'move' : 'default')};
  height: ${({ height }) => `${height}px`};
  left: 0;
  position: absolute;
  top: 0;
  transform: ${({ x, y }) => `translate(${x}px, ${y}px)`};
  width: ${({ width }) => `${width}px`};
  z-index: 0;
`;

const Edge = styled.button<{
  isMovable: boolean;
  height: number;
  value: 'tl' | 't' | 'tr' | 'l' | 'r' | 'bl' | 'b' | 'br';
  width: number;
}>`
  background-color: #fff;
  border: 1px solid #333;
  display: ${({ isMovable }) => (isMovable ? 'block' : 'none')};
  height: 8px;
  position: absolute;
  width: 8px;
  z-index: 10;
  cursor: ${({ value }) => {
    switch (value) {
      case 'tl':
      case 'br':
        return 'nwse-resize';
      case 't':
      case 'b':
        return 'ns-resize';
      case 'tr':
      case 'bl':
        return 'nesw-resize';
      case 'l':
      case 'r':
        return 'ew-resize';
      default:
        return 'default';
    }
  }};
  margin: ${({ value }) => {
    switch (value) {
      case 'tl':
        return '-5px 0 0 -5px';
      case 't':
        return '-5px 0 0 -3px';
      case 'tr':
        return '-5px 0 0 -1px';
      case 'l':
        return '-3px 0 0 -5px';
      case 'r':
        return '-3px 0 0 -1px';
      case 'bl':
        return '-1px 0 0 -5px';
      case 'b':
        return '-1px 0 0 -3px';
      case 'br':
        return '-1px 0 0 -1px';
      default:
        return 0;
    }
  }};
  transform: ${({ height, value, width }) => {
    switch (value) {
      case 'tl':
        return 'translate(0, 0)';
      case 't':
        return `translate(${(width - 8) / 2}px, 0)`;
      case 'tr':
        return `translate(${width - 8}px, 0)`;
      case 'l':
        return `translate(0, ${(height - 8) / 2}px)`;
      case 'r':
        return `translate(${width - 8}px, ${(height - 8) / 2}px)`;
      case 'bl':
        return `translate(0, ${height - 8}px)`;
      case 'b':
        return `translate(${(width - 8) / 2}px, ${height - 8}px)`;
      case 'br':
        return `translate(${width - 8}px, ${height - 8}px)`;
      default:
        return 'none';
    }
  }};
`;

const edges = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'] as const;

const initialState = Object.freeze({
  direction: 'none',
  isDragging: false,
  isResizing: false,
  offsetX: 0,
  offsetY: 0,
  offset: {
    x: 0,
    y: 0
  },
  originalRoi: {
    height: 0,
    width: 0,
    x: 0,
    y: 0
  },
  roi: {
    height: 10,
    width: 10,
    x: 0,
    y: 0
  }
});

interface BoundingBoxProps {
  isMovable: boolean;
  isRejected: boolean;
  minRoi: any;
  restrict: RefObject<any>;
  roi: any;
  className?: string;
  onDragStop?: (roi: any) => void;
  onResizeStop?: (roi: any) => void;
}

type State = typeof initialState;

export class BoundingBox extends Component<BoundingBoxProps, State> {
  static defaultProps = {
    isMovable: true,
    isRejected: false,
    minRoi: {}
  };

  state = initialState;

  componentDidMount() {
    this.initializeRoi();

    // Drag listener
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragStop);

    // Resize listener
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeStop);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragStop);
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeStop);
  }

  get restrictSize() {
    const { restrict } = this.props;
    const { height, left, top, width } = restrict.getBoundingClientRect();

    return {
      restrictHeight: height,
      restrictWidth: width,
      restrictX: left,
      restrictY: top
    };
  }

  get boxSize() {
    const { current } = this.boxRef;
    const { height, left, top, width } = current.getBoundingClientRect();

    return {
      boxHeight: height,
      boxWidth: width,
      boxX: left,
      boxY: top
    };
  }

  boxRef = createRef<HTMLDivElement>();

  initializeRoi = () => {
    const { roi } = this.props;
    this.setState(state => ({
      ...state,
      roi
    }));
  };

  // Drag
  handleDragMove = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    const { restrictHeight, restrictWidth, restrictX, restrictY } = this.restrictSize;
    const { isMovable } = this.props;
    const { isDragging, offset, roi } = this.state;

    if (!isMovable || !isDragging) {
      return;
    }

    const x = Math.min(Math.max(clientX - restrictX - offset.x, 0), restrictWidth - roi.width);
    const y = Math.min(Math.max(clientY - restrictY - offset.y, 0), restrictHeight - roi.height);
    this.setState(state => ({
      ...state,
      roi: {
        ...state.roi,
        x,
        y
      }
    }));
    e.preventDefault();
  };

  handleDragStop = () => {
    const { onDragStop } = this.props;
    const { isDragging, roi } = this.state;

    if (!isDragging) {
      return;
    }

    this.setState(state => ({
      ...state,
      isDragging: false
    }));
    onDragStop && onDragStop(roi);
  };

  handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    const { boxX, boxY } = this.boxSize;
    const { clientX, clientY } = e;
    const x = clientX - boxX;
    const y = clientY - boxY;
    this.setState(state => ({
      ...state,
      isDragging: true,
      offset: {
        x,
        y
      },
      originalRoi: {
        ...state.originalRoi,
        x: boxX,
        y: boxY
      }
    }));
    e.stopPropagation();
  };

  // Resize
  handleResizeMove = (e: MouseEvent) => {
    const { clientX, clientY } = e;
    const { restrictHeight, restrictWidth, restrictX, restrictY } = this.restrictSize;
    const { isMovable, minRoi } = this.props;
    const { direction, isResizing, originalRoi, roi } = this.state;

    if (!isMovable || !isResizing) {
      return;
    }

    let height = originalRoi.height;
    let width = originalRoi.width;
    let x = roi.x;
    let y = roi.y;

    if (direction.includes('t')) {
      y = Math.max(clientY - restrictY, 0);
      height = Math.min(
        Math.max(originalRoi.height - (clientY - originalRoi.y), minRoi.height || 0),
        restrictHeight - roi.y
      );
    }

    if (direction.includes('l')) {
      x = Math.max(clientX - restrictX, 0);
      width = Math.min(
        Math.max(originalRoi.width - (clientX - originalRoi.y), minRoi.width || 0),
        restrictWidth - roi.x
      );
    }

    if (direction.includes('r')) {
      width = Math.min(
        Math.max(originalRoi.width + (clientX - originalRoi.x), minRoi.width || 0),
        restrictWidth - roi.x
      );
    }

    if (direction.includes('b')) {
      height = Math.min(
        Math.max(originalRoi.height + (clientY - originalRoi.y), minRoi.height || 0),
        restrictHeight - roi.y
      );
    }

    this.setState(state => ({
      ...state,
      roi: {
        height,
        width,
        x,
        y
      }
    }));
    e.preventDefault();
  };

  handleResizeStop = () => {
    const { onResizeStop } = this.props;
    const { isResizing, roi } = this.state;

    if (!isResizing) {
      return;
    }

    this.setState(state => ({
      ...state,
      direction: 'none',
      isResizing: false
    }));
    onResizeStop && onResizeStop(roi);
  };

  handleResizeStart = (e: React.MouseEvent<HTMLButtonElement>) => {
    const { boxHeight, boxWidth } = this.boxSize;
    const { clientX, clientY, currentTarget } = e;
    this.setState(state => ({
      ...state,
      direction: currentTarget.value,
      isResizing: true,
      originalRoi: {
        height: boxHeight,
        width: boxWidth,
        x: clientX,
        y: clientY
      }
    }));
    e.stopPropagation();
  };

  render() {
    const { roi } = this.state;
    const { children, className, isMovable, isRejected } = this.props;

    return (
      <BoxWrapper
        className={className}
        isMovable={isMovable}
        isRejected={isRejected}
        onMouseDown={this.handleDragStart}
        ref={this.boxRef}
        {...roi}
      >
        {edges.map(direction => (
          <Edge
            height={roi.height}
            isMovable={isMovable}
            key={direction}
            onMouseDown={this.handleResizeStart}
            onTouchStart={this.handleResizeStart}
            type="button"
            value={direction}
            width={roi.width}
          />
        ))}
        {children}
      </BoxWrapper>
    );
  }
}
