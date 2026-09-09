import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from '@vicinae/api';
import { useEffect, useState } from 'react';
import { addPort, addService, getAllServices } from '../utils/firewalld';

interface AddRuleFormProps {
  zoneName: string;
  onAdded: () => void;
}

const PORT_PATTERN = /^\d{1,5}(-\d{1,5})?\/(tcp|udp)$/;

interface FormValues {
  kind: string;
  port: string;
  service: string;
  permanent: boolean;
}

function asFormValues(values: Form.Values): FormValues {
  return values as unknown as FormValues;
}

export default function AddRuleForm({ zoneName, onAdded }: AddRuleFormProps) {
  const { pop } = useNavigation();
  const [kind, setKind] = useState('port');
  const [services, setServices] = useState<string[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [portError, setPortError] = useState<string | undefined>();

  useEffect(() => {
    getAllServices()
      .then(setServices)
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: 'Failed to load service list',
          message: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => setServicesLoading(false));
  }, []);

  async function handleSubmit(rawValues: Form.Values) {
    const values = asFormValues(rawValues);
    if (values.kind === 'port' && !PORT_PATTERN.test(values.port.trim())) {
      setPortError('Use the form <port>/tcp or <port>/udp, e.g. 8080/tcp');
      return;
    }

    try {
      if (values.kind === 'port') {
        await addPort(zoneName, values.port.trim(), values.permanent);
      } else {
        await addService(zoneName, values.service, values.permanent);
      }
      showToast({
        style: Toast.Style.Success,
        title: 'Added',
        message: values.kind === 'port' ? values.port : values.service,
      });
      onAdded();
      pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to add rule',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Add to ${zoneName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="kind" title="Type" value={kind} onChange={setKind}>
        <Form.Dropdown.Item value="port" title="Port" />
        <Form.Dropdown.Item value="service" title="Service" />
      </Form.Dropdown>

      {kind === 'port' && (
        <Form.TextField
          id="port"
          title="Port"
          placeholder="8080/tcp"
          error={portError}
          onChange={() => setPortError(undefined)}
        />
      )}

      {kind === 'service' && (
        <Form.Dropdown
          id="service"
          title="Service"
          isLoading={servicesLoading}
          filtering
          throttle
        >
          {services.map((service) => (
            <Form.Dropdown.Item key={service} value={service} title={service} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Checkbox
        id="permanent"
        label="Persist across reboot"
        defaultValue={false}
      />
      <Form.Description
        text={`Zone: ${zoneName}. Applied immediately either way.`}
      />
    </Form>
  );
}
