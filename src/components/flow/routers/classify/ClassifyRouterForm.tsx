import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet, Tab } from 'components/dialog/Dialog';
import { renderIssues } from 'components/flow/actions/helpers';
import { RouterFormProps } from 'components/flow/props';
import { nodeToState, stateToNode } from './helpers';
import { createResultNameInput } from 'components/flow/routers/widgets';
import TypeList from 'components/nodeeditor/TypeList';
import * as React from 'react';
import { FormState, mergeForm, StringEntry, FormEntry } from 'store/nodeEditor';
import {
  Alphanumeric,
  Required,
  shouldRequireIf,
  StartIsNonNumeric,
  validate
} from 'store/validators';
import CaseList, { CaseProps } from 'components/flow/routers/caselist/CaseList';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { Asset } from 'store/flowContext';
import { renderIf } from 'utils';
import { intentOperatorList } from 'config/operatorConfigs';
import TextInputElement from 'components/form/textinput/TextInputElement';
import { DEFAULT_OPERAND } from 'components/nodeeditor/constants';
import { fetchAsset } from 'external';
import styles from './ClassifyRouterForm.module.scss';
import i18n from 'config/i18n';

export interface ClassifyRouterFormState extends FormState {
  hiddenCases: CaseProps[];
  resultName: StringEntry;
  classifier: FormEntry;
  cases: CaseProps[];
  operand: StringEntry;
}

export default class ClassifyRouterForm extends React.Component<
  RouterFormProps,
  ClassifyRouterFormState
> {
  constructor(props: RouterFormProps) {
    super(props);

    this.state = nodeToState(this.props.nodeSettings);
    bindCallbacks(this, {
      include: [/^handle/]
    });

    // we need to resolve our classifier for intent selection
    if (this.state.classifier.value) {
      // TODO: don't use asset as intermediary now that AssetSelector deals in native options
      fetchAsset(this.props.assetStore.classifiers, this.state.classifier.value.uuid).then(
        (classifier: Asset) => {
          if (classifier) {
            this.handleUpdate({
              classifier: { ...this.state.classifier.value, ...classifier.content }
            });
          }
        }
      );
    }
  }

  private handleUpdate(
    keys: {
      resultName?: string;
      classifier?: any;
    },
    submitting = false
  ): boolean {
    const updates: Partial<ClassifyRouterFormState> = {};

    if (keys.hasOwnProperty('resultName')) {
      updates.resultName = validate(i18n.t('forms.result_name', 'Result Name'), keys.resultName, [
        shouldRequireIf(submitting),
        Required,
        Alphanumeric,
        StartIsNonNumeric
      ]);
    }

    if (keys.hasOwnProperty('classifier')) {
      updates.classifier = validate(i18n.t('forms.classifier', 'Classifier'), keys.classifier, [
        shouldRequireIf(submitting)
      ]);
    }

    const updated = mergeForm(this.state, updates);

    // update our form
    this.setState(updated);
    return updated.valid;
  }

  private handleCasesUpdated(cases: CaseProps[]): void {
    const invalidCase = cases.find((caseProps: CaseProps) => !caseProps.valid);
    this.setState({ cases, valid: !invalidCase });
  }

  private handleUpdateResultName(value: string): boolean {
    return this.handleUpdate({ resultName: value });
  }

  private handleSave(): void {
    // if we still have invalid cases, don't move forward
    const invalidCase = this.state.cases.find((caseProps: CaseProps) => !caseProps.valid);
    if (invalidCase) {
      return;
    }

    // validate our result name in case they haven't interacted
    const valid = this.handleUpdate(
      {
        resultName: this.state.resultName.value,
        classifier: this.state.classifier.value
      },
      true
    );

    if (valid) {
      this.props.updateRouter(stateToNode(this.props.nodeSettings, this.state));
      this.props.onClose(false);
    }
  }

  private handleClassifierUpdated(selected: Asset[]): void {
    this.handleUpdate({ classifier: selected[0] });
  }

  private handleOperandUpdated(value: string): void {
    this.setState({
      operand: validate(i18n.t('forms.operand', 'Operand'), value, [Required])
    });
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true)
      }
    };
  }

  private dialog: Dialog;

  private renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    const tabs: Tab[] = [
      {
        name: i18n.t('forms.classifier_input'),
        checked: this.state.operand.value !== DEFAULT_OPERAND,
        body: (
          <>
            <div className={`${styles.label} u font secondary body-md color-neutral-cloudy`}>
              {i18n.t('forms.classifier_input_description')} <code>{DEFAULT_OPERAND}</code>.
            </div>

            <TextInputElement
              name={i18n.t('forms.operand', 'Operand')}
              showLabel={false}
              autocomplete={true}
              onChange={this.handleOperandUpdated}
              entry={this.state.operand}
            />
          </>
        )
      }
    ];

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        tabs={tabs}
        ref={ele => {
          this.dialog = ele;
        }}
      >
        <TypeList __className="" initialType={typeConfig} onChange={this.props.onTypeChange} />

        <div className={styles.form_element}>
          <div className={`${styles.label} u font secondary body-md color-neutral-cloudy`}>
            <span>{i18n.t('forms.execute')}</span>
            <span
              className={styles.link}
              onClick={() => {
                this.dialog.showTab(0);
              }}
            >
              {this.state.operand.value === DEFAULT_OPERAND
                ? i18n.t('forms.the_last_response')
                : this.state.operand.value}
            </span>
            <span>{i18n.t('forms.through_the_classifier')}</span>
          </div>

          <AssetSelector
            key="select_classifier"
            name={i18n.t('forms.classifier', 'Classifier')}
            placeholder="Select the classifier to use"
            assets={this.props.assetStore.classifiers}
            onChange={this.handleClassifierUpdated}
            entry={this.state.classifier}
          />
        </div>

        {renderIf(!!this.state.classifier.value)(
          <>
            <div className="u font secondary body-md color-neutral-cloudy">
              {i18n.t('forms.message_label')}
            </div>

            <CaseList
              data-spec="cases"
              cases={this.state.cases}
              onCasesUpdated={this.handleCasesUpdated}
              operators={intentOperatorList}
              classifier={this.state.classifier.value}
            />
          </>
        )}

        {createResultNameInput(this.state.resultName, this.handleUpdateResultName)}
        {renderIssues(this.props)}
      </Dialog>
    );
  }

  public render(): JSX.Element {
    return this.renderEdit();
  }
}
