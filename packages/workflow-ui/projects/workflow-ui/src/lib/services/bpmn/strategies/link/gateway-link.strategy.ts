import { Inject, Injectable } from '@angular/core';
import { WorkflowElement } from '../../../../classes';
import { LinkStrategy } from '../../../../interfaces';
import {
  CustomBpmnModdle,
  ModdleElement,
  BpmnStatementNode,
  ConditionOperatorPair,
  RecordOfAnyType,
} from '../../../../types';
import { CONDITION_LIST } from '../../../../const';
import { UtilsService } from '../../../utils.service';
import { InputTypes } from '../../../../enum';

@Injectable()
export class GatewayLinkStrategy implements LinkStrategy<ModdleElement> {
  constructor(
    private readonly moddle: CustomBpmnModdle,
    private readonly utils: UtilsService,
    @Inject(CONDITION_LIST)
    private readonly conditions: Array<ConditionOperatorPair>,
  ) { }
  execute(
    element: WorkflowElement<ModdleElement>,
    node: BpmnStatementNode,
  ): ModdleElement[] {
    const link = this.createMainLink(node);
    return [...link];
  }

  private createMainLink(node: BpmnStatementNode) {
    const link = [];
    const from = node.tag;
    for (let i = 0; i < node.next.length; i++) {
      const id = i == 0 ? node.outgoing : `Flow_${this.utils.uuid()}`;
      const to = node.next[i].tag;
      node.next[i].incoming = id;
      const attrs = this.createLinkAttrs(id, from, to);
      const { script, name } = this.createScript(node, id);
      const expression = this.moddle.create('bpmn:FormalExpression', {
        body: script,
        language: 'Javascript',
        'xsi:type': 'bpmn:tFormalExpression',
      });
      attrs['conditionExpression'] = expression;
      attrs['name'] = name;
      const _link = this.moddle.create('bpmn:SequenceFlow', attrs);
      from.get('outgoing').push(_link);
      to.get('incoming').push(_link);
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

  private createScript(node: BpmnStatementNode, flowId: string) {
    const lastNodeWithOutput = this.getLastNodeWithOutput(node);
    const read = `var readObj = JSON.parse(execution.getVariable('${lastNodeWithOutput.element.id}'));`;
    const declarations = `var ids = [];var json = S("{}");`;
    const column = node.workflowNode.state.get('columnName');
    const condition = this.getCondition(node);
    const loop = `
      for(var key in readObj){
          var taskValuePair = readObj[key];
          if(taskValuePair && taskValuePair.value${condition}){
              ids.push(taskValuePair.id);
            }
        }
      `;
    const setters = `
      json.prop("taskIds", ids);
      execution.setVariable('${flowId}',json);
      if(ids.length > 0){true;}else {false;}
      `;
    return {
      script: [read, declarations, loop, setters].join('\n'),
      name: `${column}${condition}`,
    };
  }

  private getLastNodeWithOutput(node: BpmnStatementNode) {
    let current = node;
    while (current) {
      if (current.element.outputs) {
        return current;
      }
      current = current.prev[0];
    }
    return current;
  }

  private getCondition(node: BpmnStatementNode) {
    let value = node.workflowNode.state.get('value');
    const valueType = node.workflowNode.state.get('valueInputType');
    if (valueType === InputTypes.Text || valueType === InputTypes.List) {
      value = `'${value}'`;
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