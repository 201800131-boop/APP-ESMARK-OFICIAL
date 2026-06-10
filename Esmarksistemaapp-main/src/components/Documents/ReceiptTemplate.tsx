import React from 'react';

interface ReceiptTemplateProps {
  receiptNumber: string;
  date: Date;
  customerName: string;
  amount: number;
  amountInWords: string;
  concept: string;
  previousBalance?: number;
  payment: number;
  currentBalance: number;
  orderNumber?: string;
}

export default function ReceiptTemplate({
  receiptNumber,
  date,
  customerName,
  amount,
  amountInWords,
  concept,
  previousBalance = 0,
  payment,
  currentBalance,
  orderNumber
}: ReceiptTemplateProps) {
  
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value: number) => {
    return `L. ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  return (
    <div id="receipt-template" style={{
      width: '216mm',
      minHeight: '140mm',
      padding: '0',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      pageBreakAfter: 'always'
    }}>
      {/* HEADER ROJO */}
      <div style={{
        backgroundColor: '#E31E24',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '4px solid #B71C1C'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            letterSpacing: '1px'
          }}>
            ESMARK MEDIA
          </h1>
          <div style={{
            color: '#ffffff',
            fontSize: '11px',
            lineHeight: '1.6',
            opacity: 0.95
          }}>
            <div>Col. Alemana, 2da Calle, entre 9na y 10ma Avenida, #11</div>
            <div>San Pedro Sula, Cortés, Honduras</div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ marginRight: '15px' }}>📞 9550-0616 / 9674-2011</span>
              <span>✉️ esmarkmediahn@gmail.com</span>
            </div>
            <div style={{ marginTop: '2px', fontWeight: 'bold' }}>RTN: 08019026848596</div>
          </div>
        </div>
        
        {/* Logo placeholder - espacio para logo */}
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255,255,255,0.3)',
          marginLeft: '20px'
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: '40px',
            fontWeight: 'bold'
          }}>EM</div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ padding: '30px 40px' }}>
        
        {/* TÍTULO Y NÚMERO DE RECIBO */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px',
          borderBottom: '2px solid #E31E24',
          paddingBottom: '15px'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              margin: '0'
            }}>RECIBO</h2>
            {orderNumber && (
              <div style={{
                fontSize: '11px',
                color: '#666',
                marginTop: '4px'
              }}>
                Pedido: #{orderNumber}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#E31E24',
              marginBottom: '8px'
            }}>
              N° {receiptNumber}
            </div>
            <div style={{
              fontSize: '13px',
              color: '#333',
              padding: '6px 12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              📅 {formatDate(date)}
            </div>
          </div>
        </div>

        {/* RECIBÍ DE */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '8px'
          }}>
            RECIBÍ DE:
          </div>
          <div style={{
            fontSize: '15px',
            color: '#000',
            padding: '10px 15px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {customerName}
          </div>
        </div>

        {/* LA CANTIDAD DE */}
        <div style={{ marginBottom: '25px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '8px'
          }}>
            LA CANTIDAD DE:
          </div>
          <div style={{
            fontSize: '14px',
            color: '#000',
            padding: '12px 15px',
            backgroundColor: '#f0f8ff',
            border: '2px solid #2196F3',
            borderRadius: '4px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            textTransform: 'uppercase',
            fontWeight: '500'
          }}>
            {amountInWords}
          </div>
        </div>

        {/* EN CONCEPTO DE */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#333',
            marginBottom: '8px'
          }}>
            EN CONCEPTO DE:
          </div>
          <div style={{
            fontSize: '14px',
            color: '#000',
            padding: '12px 15px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minHeight: '60px',
            lineHeight: '1.6'
          }}>
            {concept}
          </div>
        </div>

        {/* TABLA DE SALDOS */}
        <div style={{ marginBottom: '40px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #333'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#E31E24' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  border: '1px solid #B71C1C',
                  width: '33.33%'
                }}>
                  SALDO ANTERIOR
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  border: '1px solid #B71C1C',
                  width: '33.33%'
                }}>
                  ABONO
                </th>
                <th style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  border: '1px solid #B71C1C',
                  width: '33.33%'
                }}>
                  SALDO ACTUAL
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#333',
                  border: '1px solid #333',
                  backgroundColor: '#fafafa'
                }}>
                  {formatCurrency(previousBalance)}
                </td>
                <td style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#E31E24',
                  border: '1px solid #333',
                  backgroundColor: '#fff5f5'
                }}>
                  {formatCurrency(payment)}
                </td>
                <td style={{
                  padding: '18px 12px',
                  textAlign: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: currentBalance === 0 ? '#00C853' : '#FF6F00',
                  border: '1px solid #333',
                  backgroundColor: currentBalance === 0 ? '#f1f8f4' : '#fff8f0'
                }}>
                  {formatCurrency(currentBalance)}
                </td>
              </tr>
            </tbody>
          </table>
          
          {currentBalance === 0 && (
            <div style={{
              marginTop: '15px',
              padding: '10px 15px',
              backgroundColor: '#e8f5e9',
              border: '2px solid #00C853',
              borderRadius: '4px',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#00C853'
            }}>
              ✓ PAGADO EN SU TOTALIDAD
            </div>
          )}
        </div>

        {/* FIRMA */}
        <div style={{
          marginTop: '60px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center', width: '300px' }}>
            <div style={{
              borderTop: '2px solid #333',
              paddingTop: '8px',
              fontSize: '12px',
              color: '#333',
              fontWeight: '500'
            }}>
              FIRMA Y SELLO
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          marginTop: '40px',
          paddingTop: '15px',
          borderTop: '1px solid #ddd',
          fontSize: '10px',
          color: '#666',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          <div>Este documento es un comprobante interno de pago y no tiene validez fiscal</div>
          <div style={{ marginTop: '3px' }}>
            Para consultas: esmarkmediahn@gmail.com | Tel: 9550-0616
          </div>
        </div>
      </div>
    </div>
  );
}
