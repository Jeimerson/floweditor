import { ServiceCallMap } from 'config/interfaces';

export const ServicesCalls: ServiceCallMap = {
  omie: [
    {
      name: 'createContact',
      value: 'createContact',
      verboseName: 'Inserir contato no CRM',
      params: [
        {
          type: 'identificacao',
          verboseName: 'Identificação',
          filters: [
            {
              name: 'nCod',
              type: 'integer',
              verboseName: 'Código do Contato'
            },
            {
              name: 'cCodInt',
              type: 'text',
              verboseName: 'Código de Integração'
            },
            {
              name: 'cNome',
              type: 'string',
              verboseName: 'Nome do contato'
            },
            {
              name: 'cSobrenome',
              type: 'string',
              verboseName: 'Sobrenome do contato'
            },
            {
              name: 'cCargo',
              type: 'string',
              verboseName: 'Cargo'
            },
            {
              name: 'dDtNasc',
              type: 'string',
              verboseName: 'Data de Nascimento'
            },
            {
              name: 'nCodVend',
              type: 'integer',
              verboseName: 'Código do Vendedor'
            },
            {
              name: 'nCodConta',
              type: 'integer',
              verboseName: 'Código da Conta'
            }
          ]
        },
        {
          type: 'endereco',
          verboseName: 'Endereço',
          filters: [
            {
              name: 'cEndereco',
              type: 'string',
              maxLength: 60,
              verboseName: 'Endereço do contato '
            },
            {
              name: 'cCompl',
              type: 'string',
              maxLength: 200,
              verboseName: 'Complemento '
            },
            {
              name: 'cCEP',
              type: 'string',
              maxLength: 10,
              verboseName: 'CEP'
            },
            {
              name: 'cBairro',
              type: 'string',
              maxLength: 60,
              verboseName: 'Bairro '
            },
            {
              name: 'cCidade',
              type: 'string',
              maxLength: 50,
              verboseName: 'Cidade '
            },
            {
              name: 'cUF',
              type: 'string',
              maxLength: 50,
              verboseName: 'Estado '
            },
            {
              name: 'cPais',
              type: 'string',
              maxLength: 50,
              verboseName: 'País'
            }
          ]
        },
        {
          type: 'telefone_email',
          verboseName: 'Telefone e Email',
          filters: [
            {
              name: 'cDDDCel1',
              type: 'string',
              maxLength: 5,
              verboseName: 'DDD do celular 1'
            },
            {
              name: 'cNumCel1',
              type: 'string',
              maxLength: 15,
              verboseName: 'Número do Celular 1'
            },

            {
              name: 'cDDDCel2',
              type: 'string',
              maxLength: 5,
              verboseName: 'DDD do Celular 2'
            },
            {
              name: 'cNumCel2',
              type: 'string',
              maxLength: 15,
              verboseName: 'Número do Celular 2'
            },
            {
              name: 'cDDDTel',
              type: 'string',
              maxLength: 5,
              verboseName: 'DDD do Telefone'
            },
            {
              name: 'cNumTel',
              type: 'string',
              maxLength: 15,
              verboseName: 'Número do Telefone'
            },
            {
              name: 'cDDDFax',
              type: 'string',
              maxLength: 5,
              verboseName: 'DDD do Fax'
            },
            {
              name: 'cNumFax',
              type: 'string',
              maxLength: 15,
              verboseName: 'Número do Fax'
            },
            {
              name: 'cEmail',
              type: 'string',
              maxLength: 200,
              verboseName: 'E-mail do contato'
            },
            {
              name: 'cWebsite',
              type: 'string',
              maxLength: 100,
              verboseName: 'WebSite'
            }
          ]
        },
        {
          type: 'cObs',
          verboseName: 'Observações',
          filters: []
        }
      ]
    }
  ]
};
