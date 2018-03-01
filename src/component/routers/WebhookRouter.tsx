import * as React from 'react';
import update from 'immutability-helper';
import * as FlipMove from 'react-flip-move';
import { react as bindCallbacks } from 'auto-bind';
import { v4 as generateUUID } from 'uuid';
import {
    Headers,
    CallWebhook,
    Case,
    Exit,
    Router,
    SwitchRouter,
    Node,
    AnyAction,
    Methods
} from '../../flowTypes';
import { SwitchRouterState } from './SwitchRouter';
import { FormProps } from '../NodeEditor';
import SelectElement from '../form/SelectElement';
import HeaderElement, { Header } from '../form/HeaderElement';
import TextInputElement, { HTMLTextElement } from '../form/TextInputElement';
import FormElement from '../form/FormElement';
import ComponentMap from '../../services/ComponentMap';
import { Type } from '../../config';
import { DEFAULT_BODY } from '../NodeEditor';
import { jsonEqual } from '../../utils';
import * as styles from './Webhook.scss';

export type WebhookRouterProps = Partial<FormProps>;

interface WebhookRouterState extends SwitchRouterState {
    headers: Header[];
    method: Methods;
}

interface MethodMap {
    value: Methods;
    label: Methods;
}

type MethodOptions = MethodMap[];

export const initialState: WebhookRouterState = {
    cases: [],
    headers: [{ name: '', value: '', uuid: generateUUID() }],
    method: Methods.GET
};

export const mapHeaders = (headers: Headers): Header[] =>
    Object.keys(headers).map(key => ({
        name: key,
        value: headers[key],
        uuid: generateUUID()
    }));

export const getInitialState = (action: CallWebhook): WebhookRouterState => {
    let state = initialState;
    if (action.type === 'call_webhook') {
        state = { ...state, method: action.method };
        if (action.headers && Object.keys(action.headers).length) {
            const existingHeaders = mapHeaders(action.headers);
            initialState.headers.unshift(...existingHeaders);
            state = {
                ...state,
                headers: [...existingHeaders, state.headers]
            } as WebhookRouterState;
        }
    }
    return state;
};

const WEBHOOK_DESC =
    'Use this step to trigger actions in external services or fetch data to use in this Flow. Enter a URL to call below.';

export default class WebhookRouter extends React.Component<WebhookRouterProps, WebhookRouterState> {
    private methodOptions: MethodOptions = [
        { value: Methods.GET, label: Methods.GET },
        { value: Methods.POST, label: Methods.POST },
        { value: Methods.PUT, label: Methods.PUT }
    ];

    constructor(props: WebhookRouterProps) {
        super(props);

        this.state = getInitialState(this.props.action as CallWebhook);

        bindCallbacks(this, {
            include: [/^on/]
        });
    }

    public onValid(widgets: { [name: string]: React.Component }): void {
        if (this.props.translating) {
            return this.props.saveLocalizations(widgets);
        }

        this.props.updateRouter();
    }

    public onUpdateForm(widgets: { [name: string]: React.Component }): void {
        if (this.props.showAdvanced) {
            const methodEle = widgets.MethodMap as SelectElement;
            const { state: { value: method } } = methodEle;

            if (method === Methods.GET) {
                this.props.removeWidget('Body');
            }

            this.setState({
                method
            });
        }
    }

    private onHeaderRemoved(header: HeaderElement): void {
        const newHeaders = this.addEmptyHeader(update(this.state.headers, {
            $splice: [[header.props.index, 1]]
        }) as Header[]);

        this.setState({ headers: newHeaders }, () => this.props.removeWidget(header.props.name));
    }

    private onHeaderChanged(ele: HeaderElement): void {
        const { state: { name, value }, props: { header: { uuid } } } = ele;

        if (!name && !value) {
            this.onHeaderRemoved(ele);
        } else {
            const headers: Header[] = this.addEmptyHeader(update(this.state.headers, {
                [ele.props.index]: {
                    $set: {
                        name,
                        value,
                        uuid
                    } as Header
                }
            }) as Header[]);

            this.setState({ headers });
        }
    }

    private onMethodChanged(method: MethodMap): void {
        this.setState({ method: method.value as Methods }, () => this.props.triggerFormUpdate());
    }

    private addEmptyHeader(headers: Header[]): Header[] {
        const newHeaders: Header[] = headers;
        let hasEmpty = false;

        for (const header of newHeaders) {
            if (
                (header.name ? header.name.trim() : '').length === 0 &&
                (header.value ? header.value.trim() : '').length === 0
            ) {
                hasEmpty = true;
                break;
            }
        }

        if (!hasEmpty) {
            newHeaders.push({ name: '', value: '', uuid: generateUUID() });
        }

        return newHeaders;
    }

    private getFormAttrs(): { method: Methods; url: string } {
        let method = Methods.GET;
        let url = '';

        if (this.props.action.type === 'call_webhook') {
            ({ method, url } = this.props.action as CallWebhook);
        }

        return {
            method,
            url
        };
    }

    private getSummary(): JSX.Element {
        const baseText = 'configure the headers';
        const linkText = this.state.method === Methods.GET ? baseText : `${baseText} and body`;

        return (
            <React.Fragment>
                If you need to, you can also{' '}
                <a href="#" onClick={this.props.onToggleAdvanced}>
                    {linkText}
                </a>{' '}
                of your request.
            </React.Fragment>
        );
    }

    private getReqBody(): string {
        let reqBody = DEFAULT_BODY;

        if ((this.props.action as CallWebhook).body) {
            ({ body: reqBody } = this.props.action as CallWebhook);
        }

        return reqBody;
    }

    private renderForm(): JSX.Element {
        if (this.props.translating) {
            return this.props.getExitTranslations();
        }

        const { method, url }: { method: Methods; url: string } = this.getFormAttrs();

        const summary: JSX.Element = this.getSummary();

        return (
            <React.Fragment>
                <p>{WEBHOOK_DESC}</p>
                <div className={styles.method}>
                    <SelectElement
                        ref={this.props.onBindWidget}
                        name="MethodMap"
                        defaultValue={method}
                        onChange={this.onMethodChanged}
                        options={this.methodOptions}
                    />
                </div>
                <div className={styles.url}>
                    <TextInputElement
                        ref={this.props.onBindWidget}
                        name="URL"
                        placeholder="Enter a URL"
                        value={url}
                        autocomplete={true}
                        required={true}
                        url={true}
                        ComponentMap={this.props.ComponentMap}
                        config={this.props.config}
                    />
                </div>
                <div className={styles.instructions}>
                    <p>
                        {summary} If your server responds with JSON, each property will be added to
                        the Flow.
                    </p>
                    <pre className={styles.code}>
                        {'{ "product": "Solar Charging Kit", "stock level": 32 }'}
                    </pre>
                    <p>
                        In this example{' '}
                        <span className={styles.example}>@webhook.json.product</span> and{' '}
                        <span className={styles.example}>@webhook.json["stock level"]</span> would
                        be available in all future steps.
                    </p>
                </div>
            </React.Fragment>
        );
    }

    private renderAdvanced(): JSX.Element {
        if (this.props.translating) {
            return null;
        }

        const headerElements: JSX.Element[] = this.state.headers.map(
            (header: Header, index: number, arr: Header[]) => {
                const isEmpty = index === this.state.headers.length - 1;
                return (
                    <div key={header.uuid}>
                        <HeaderElement
                            ref={this.props.onBindAdvancedWidget}
                            name={`header_${header.uuid}`}
                            header={header}
                            onRemove={this.onHeaderRemoved}
                            onChange={this.onHeaderChanged}
                            index={index}
                            empty={isEmpty}
                            ComponentMap={this.props.ComponentMap}
                            config={this.props.config}
                        />
                    </div>
                );
            }
        );
        const reqBody = this.getReqBody();
        const helpText = `Modify the body of the ${this.state
            .method} request that will be sent to your webhook.`;
        const reqBodyLabel = `${this.state.method} Body`;
        const reqBodyHelp = `Modify the body of your ${this.state.method} request.`;
        const needsBody = this.state.method === Methods.POST || this.state.method === Methods.PUT;
        const bodyForm: JSX.Element = needsBody ? (
            <div className={styles.bodyForm}>
                <h4>{reqBodyLabel}</h4>
                <p>{reqBodyHelp}</p>
                <TextInputElement
                    __className={styles.reqBody}
                    ref={this.props.onBindAdvancedWidget}
                    name="Body"
                    showLabel={false}
                    value={reqBody}
                    helpText={helpText}
                    autocomplete={true}
                    textarea={true}
                    required={true}
                    ComponentMap={this.props.ComponentMap}
                    config={this.props.config}
                />
            </div>
        ) : null;
        return (
            <React.Fragment>
                <h4 className={styles.headers_title}>Headers</h4>
                <p className={styles.info}>
                    Add any additional headers below that you would like to send along with your
                    request.
                </p>
                <FlipMove
                    easing="ease-out"
                    enterAnimation="accordionVertical"
                    leaveAnimation="accordionVertical"
                    duration={300}>
                    {headerElements}
                </FlipMove>
                {bodyForm}
            </React.Fragment>
        );
    }
    public render(): JSX.Element {
        return this.props.showAdvanced ? this.renderAdvanced() : this.renderForm();
    }
}
