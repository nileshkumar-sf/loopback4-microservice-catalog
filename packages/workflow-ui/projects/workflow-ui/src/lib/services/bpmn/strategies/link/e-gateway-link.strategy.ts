import {Inject, Injectable} from '@angular/core';
import {WorkflowElement} from '../../../../classes';
import {LinkStrategy} from '../../../../interfaces';
import {
  CustomBpmnModdle,
  ModdleElement,
  BpmnStatementNode,
  ConditionOperatorPair,
  RecordOfAnyType,
} from '../../../../types';
import {CONDITION_LIST} from '../../../../const';
import {UtilsService} from '../../../utils.service';
import {ConditionTypes, InputTypes} from '../../../../enum';
import {EGatewayElement} from '../../elements';

const BPMN_SEQ_FLOW = 'bpmn:SequenceFlow';
@Injectable()
export class EGatewayLinkStrategy implements LinkStrategy<ModdleElement> {
  constructor(
    private readonly moddle: CustomBpmnModdle,
    private readonly utils: UtilsService,
    @Inject(CONDITION_LIST)
    private readonly conditions: Array<ConditionOperatorPair>,
  ) {}
/**
 * It creates a link between the element and the node
 * @param element - The element that is being processed.
 * @param {BpmnStatementNode} node - BpmnStatementNode
 * @returns An array of ModdleElements
 */
  execute(
    element: WorkflowElement<ModdleElement>,
    node: BpmnStatementNode,
  ): ModdleElement[] {
    const links = this.createLink(node);
    return links;
  }

  private createLink(
    node: BpmnStatementNode,
  ) {
    const link = [];
    const from = node.tag;
    for (let i = 0; i < node.next.length; i++) {
      const flag = node.next[i].element.id?.split('_').includes('true');
      const id = flag ? (node.element as EGatewayElement).elseOutGoing : node.outgoing;
      const to = node.next[i].tag;
      node.next[i].incoming = id;
      const attrs = this.createLinkAttrs(id, from, to);
      const {script, name} = this.createScript(node, id, flag);
      const expression = this.moddle.create('bpmn:FormalExpression', {
        body: script,
        language: 'Javascript',
        'xsi:type': 'bpmn:tFormalExpression',
      });
      attrs['conditionExpression'] = expression;
      attrs['name'] = name;
      const _link = this.moddle.create(BPMN_SEQ_FLOW, attrs);
      const outgoing = from.get('outgoing');
      const incoming = to.get('incoming');
      if (!outgoing.find((item: any) => item.id === id)) {
        outgoing.push(_link);
      }
      if (!incoming.find((item: any) => item.id === id)) {
        incoming.push(_link);
      }
      link.push(_link);
    }
    return link;
  }

  private createLinkAttrs(id: string, from: ModdleElement, to: ModdleElement) {
    const start = this.moddle.create('bpmn:FlowNode', {
      id: from.id,
    });
    const end = this.moddle.create('bpmn:FlowNode', {
      id: to.id,
    });
    const attrs: RecordOfAnyType = {
      id: id,
      sourceRef: start,
      targetRef: end,
    };
    return attrs;
  }

  private createScript(
    node: BpmnStatementNode,
    flowId: string,
    isElse?: boolean,
  ) {
    const lastNodeWithOutput = this.getLastNodeWithOutput(node);
    const read = `var readObj = JSON.parse(execution.getVariable('${lastNodeWithOutput.element.id}'));`;
    const declarations = `var ids = [];var json = S("{}");`;
    const column = node.workflowNode.state.get('columnName');
    const condition = this.getCondition(node);
    const loop = this.createLoopScript(node, condition, isElse);
    const setters = `
      json.prop("taskIds", ids);
      execution.setVariable('${flowId}',json);
      if(ids.length > 0){true;}else {false;}
      `;
    return {
      script: [read, declarations, loop, setters].join('\n'),
      name: isElse ? `!(${column}${condition})` : `${column}${condition}`,
    };
  }

  private createLoopScript(
    node: BpmnStatementNode,
    condition: string,
    isElse = false,
  ) {
    switch (node.workflowNode.state.get('condition')) {
      case ConditionTypes.PastToday:
        return `
                for(var key in readObj){
                  var taskValuePair = readObj[key];
                  if(taskValuePair && taskValuePair.value){
                    var readDateValue = new Date(taskValuePair.value);
                    if(${isElse ? '!' : ''}(readDateValue < new Date())){
                      ids.push(taskValuePair.id);
                    }
                  }
                }
              `;
      case ConditionTypes.ComingIn:
      case ConditionTypes.PastBy:
        return `
                for(var key in readObj){
                  var taskValuePair = readObj[key];
                  if(taskValuePair && taskValuePair.value){
                    var readDateValue = new Date(taskValuePair.value);
                    if(${
                      isElse ? '!' : ''
                    }(readDateValue > new Date() && readDateValue.setDate(readDateValue.getDate()${condition}) < new Date())){
                      ids.push(taskValuePair.id);
                    }
                  }
                }
              `;
      default:
        return `
                for(var key in readObj){
                  var taskValuePair = readObj[key];
                  if(taskValuePair && ${
                    isElse ? '!' : ''
                  }(taskValuePair.value${condition})){
                    ids.push(taskValuePair.id);
                  }
                }
              `;
    }
  }

  private getLastNodeWithOutput(node: BpmnStatementNode) {
    let queue = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if(current.element.outputs){
        return current;
      }
      if (current?.prev && current.prev.length) queue.push(...current.prev);
    }
    return queue[queue.length-1];
  }

  private getCondition(node: BpmnStatementNode) {
    let value = node.workflowNode.state.get('value');
    const valueType = node.workflowNode.state.get('valueInputType');
    if (valueType === InputTypes.Text || valueType === InputTypes.List) {
      value = `'${value}'`;
    }
    if (valueType === InputTypes.People) {
      value = `'${JSON.stringify(value)}'`;
    }
    const condition = node.workflowNode.state.get('condition');
    const pair = this.conditions.find(item => item.condition === condition);
    if (!pair) {
      return `===${value}`;
    }
    if (pair.value) {
      return `${pair.operator}${value}`;
    } else {
      return `${pair.operator}`;
    }
  }
}