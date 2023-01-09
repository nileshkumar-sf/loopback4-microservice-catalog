import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {NgxPopperjsContentComponent} from 'ngx-popperjs';
import {
  isSelectInput,
  NodeService,
  WorkflowElement,
  WorkflowPrompt,
} from '../../classes';
import {BaseGroup} from '../../classes/nodes/abstract-base-group.class';
import {ConditionTypes, InputTypes, NodeTypes} from '../../enum';
import {InvalidEntityError} from '../../errors/base.error';
import {
  AllowedValues,
  AllowedValuesMap,
  NodeWithInput,
  RecordOfAnyType,
  WorkflowNode,
} from '../../types';
import {
  EventWithInput,
  ActionWithInput,
  DateTime,
  EmailInput,
  Select,
  Constructor,
  DateType,
} from '../../types/base.types';
import {IDropdownSettings} from 'ng-multiselect-dropdown';
import {
  EmailDataInput,
  GatewayElement,
  ReadColumnValue,
  ToValueInput,
  TriggerWhenColumnChanges,
  ValueInput,
} from '../../services';
@Component({
  selector: 'workflow-group',
  templateUrl: './group.component.html',
  styleUrls: [
    './group.component.scss',
    '../../../../assets/icons/icomoon/style.css',
  ],
})
export class GroupComponent<E> implements OnInit {
  constructor(private readonly nodes: NodeService<E>) {}

  @Input()
  group: BaseGroup<E>;

  @Input()
  isLast = false;

  @Input()
  isFirst = false;

  @Input()
  eventGroups: BaseGroup<E>[];

  @Input()
  nodeType: NodeTypes;

  @Input()
  popupTemplate!: NgxPopperjsContentComponent;

  @Output()
  remove = new EventEmitter<boolean>();

  @Output()
  add = new EventEmitter<boolean>();

  @Output()
  eventAdded = new EventEmitter<unknown>();

  @Output()
  actionAdded = new EventEmitter<unknown>();

  @Output()
  itemChanged = new EventEmitter<unknown>();

  date: DateType = {month: 0, day: 0, year: 0};
  dateTime: DateTime = {
    date: {month: 0, day: 0, year: 0},
    time: {hour: null, minute: null},
  };
  emailInput: EmailInput = {
    subject: '',
    body: '',
    focusKey: '',
  };
  dropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'id',
    textField: 'fullName',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    enableCheckAll: true,
    itemsShowLimit: 1,
    allowSearchFilter: true,
    defaultOpen: true,
  };
  selectedItems = [];
  showDateTimePicker = true;
  enableActionIcon = true;
  events: WorkflowNode<E>[] = [];
  triggerEvents: WorkflowNode<E>[] = [];
  actions: WorkflowNode<E>[] = [];

  nodeList: WorkflowNode<E>[];

  public types = NodeTypes;

  @Input()
  templateMap?: {
    [key: string]: TemplateRef<RecordOfAnyType>;
  };

  @Input()
  allColumns: Select[];

  @ViewChild('emailTemplate') emailTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('listTemplate')
  listTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('numberTemplate')
  numberTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('textTemplate')
  textTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('searchableDropdownTemplate')
  searchableDropdownTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('dateTemplate')
  dateTemplate: TemplateRef<RecordOfAnyType>;

  @ViewChild('dateTimeTemplate')
  dateTimeTemplate: TemplateRef<RecordOfAnyType>;

  ngOnInit(): void {
    this.events = this.nodes.getEvents();
    this.triggerEvents = this.nodes.getEvents(true);
    this.actions = this.nodes.getActions();
  }

  ngAfterViewInit() {
    this.templateMap = {
      [InputTypes.Boolean]:
        this.templateMap?.[InputTypes.Boolean] || this.listTemplate,
      [InputTypes.List]:
        this.templateMap?.[InputTypes.List] || this.listTemplate,
      [InputTypes.Text]:
        this.templateMap?.[InputTypes.Text] || this.textTemplate,
      [InputTypes.Number]:
        this.templateMap?.[InputTypes.Number] || this.numberTemplate,
      [InputTypes.Percentage]:
        this.templateMap?.[InputTypes.Percentage] || this.numberTemplate,
      [InputTypes.Date]:
        this.templateMap?.[InputTypes.Date] || this.dateTemplate,
      [InputTypes.DateTime]:
        this.templateMap?.[InputTypes.DateTime] || this.dateTimeTemplate,
      [InputTypes.People]:
        this.templateMap?.[InputTypes.People] ||
        this.searchableDropdownTemplate,
      [InputTypes.Interval]:
        this.templateMap?.[InputTypes.Interval] || this.listTemplate,
      [InputTypes.Email]:
        this.templateMap?.[InputTypes.Email] || this.emailTemplate,
    };
  }

  setInput(input: any, nodeWithInput: any) {
    const allowedInputs = [ValueInput, EmailDataInput, ToValueInput];
    if (allowedInputs.includes(input.constructor)) {
      const value = input.getModelValue(nodeWithInput.node.state);
      if (nodeWithInput.node.state.get('email')) {
        this.emailInput = value;
      } else {
        switch (nodeWithInput.node.state.get('valueInputType')) {
          case InputTypes.Date:
            this.date = value;
            break;
          case InputTypes.DateTime:
            this.dateTime = value;
            break;
          case InputTypes.People:
            this.selectedItems = value;
            break;
        }
      }
    }
  }

  removeClick() {
    this.remove.emit(true);
  }

  addClick() {
    this.add.emit(true);
  }

  appendEmailBody(item: Select, emailInput: EmailInput) {
    if (emailInput.focusKey === 'subject') {
      emailInput.subject += ` ${item.value}`;
    }
    if (emailInput.focusKey === 'body') {
      emailInput.body += ` ${item.value}`;
    }
  }

  setFocusKey(emailInput: EmailInput, key: string) {
    emailInput.focusKey = key;
  }

  openPopup(type: NodeTypes) {
    if (type === NodeTypes.ACTION) {
      this.nodeList = this.actions;
    } else if (type === NodeTypes.EVENT) {
      this.nodeList =
        this.eventGroups.length === 1 && !this.group.children.length
          ? this.triggerEvents
          : this.events;
    } else {
      throw new InvalidEntityError('' + type);
    }
  }

  onNodeAdd(
    node: WorkflowNode<E>,
    groupType: string,
    groupId: string,
    id?: string,
  ) {
    const newNode = {
      node: this.nodes.getNodeByName(
        node.constructor.name,
        groupType,
        groupId,
        id,
        this.group.isElseGroup,
      ),
      inputs: this.nodes.mapInputs(node.prompts),
    };
    if (node.type === NodeTypes.EVENT) {
      this.eventAdded.emit({
        node: node,
        newNode: newNode,
      });
      if (newNode.node.constructor.name === 'OnIntervalEvent') {
        newNode.node.state.change('valueInputType', 'number');
      }
      this.group.children.push(newNode as EventWithInput<E>);
    } else if (node.type === NodeTypes.ACTION) {
      this.actionAdded.emit({
        node: node,
        newNode: newNode,
      });
      this.group.children.push(newNode as ActionWithInput<E>);
    } else {
      throw new InvalidEntityError('Node');
    }
  }

  onNodeRemove(index: number) {
    this.group.children.splice(index, 1);
  }

  createCallback(
    element: NodeWithInput<E>,
    input: WorkflowPrompt,
    popper: NgxPopperjsContentComponent,
  ) {
    return (value?: AllowedValues) => {
      if (value) {
        this.addValue(
          element,
          input,
          input.setValue(element.node.state, value),
          input.typeFunction(element.node.state) === InputTypes.List,
        );
      }
      popper.hide();
    };
  }

  addValue(
    element: NodeWithInput<E>,
    input: WorkflowPrompt,
    value: AllowedValues | AllowedValuesMap,
    select = false,
  ) {
    this.enableActionIcon = true;
    if (
      input.constructor.name === 'ConditionInput' &&
      element.node.constructor.name === 'OnChangeEvent'
    ) {
      if ((value as AllowedValuesMap).value === ConditionTypes.Changes) {
        /**
         * Remove node on changes event
         */
        element.node.elements.splice(-2, 2);
        element.inputs[1].prefix = '';
        this.enableActionIcon = false;
      } else {
        element.node.elements = [
          TriggerWhenColumnChanges,
          ReadColumnValue,
          GatewayElement,
        ] as unknown as Constructor<WorkflowElement<E>>[];
      }
    }
    if (select && isSelectInput(input)) {
      if (
        element.node.state.get('columnName') === 'Priority' &&
        input.inputKey !== 'condition'
      ) {
        element.node.state.change(
          `${input.inputKey}Name`,
          value as AllowedValuesMap,
        );
        this.itemChanged.emit({
          field: input,
          value: value as AllowedValuesMap,
          element: element,
        });
        value = value as AllowedValuesMap;
      } else {
        element.node.state.change(
          `${input.inputKey}Name`,
          (value as AllowedValuesMap)[input.listNameField],
        );
        this.itemChanged.emit({
          field: input,
          value: (value as AllowedValuesMap)[input.listValueField],
          element: element,
        });
        value = (value as AllowedValuesMap)[input.listValueField];
      }
    }
    element.node.state.change(input.inputKey, value);
    this.handleSubsequentInputs(element, input);
    this.itemChanged.emit({
      field: input,
      value: value,
      element: element,
    });
    this.enableActionIcon =
      element.node.state.get('condition') !== ConditionTypes.Changes;
  }

  private handleSubsequentInputs(
    element: NodeWithInput<E>,
    input: WorkflowPrompt,
  ) {
    const currentIndex = element.inputs.findIndex(
      i => i.constructor.name === input.constructor.name,
    );
    const subsequentInputs = element.inputs.filter((r, i) => i > currentIndex);
    for (const nextInput of subsequentInputs) {
      if (nextInput.prevchange) nextInput.prevchange(element.node.state);
      const nextKey = nextInput.inputKey;
      element.node.state.remove(nextKey);
      element.node.state.remove(`${nextKey}Name`);
    }
  }
}
