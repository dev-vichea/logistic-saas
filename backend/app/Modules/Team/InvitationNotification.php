<?php

namespace App\Modules\Team;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token, public string $organizationName)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('Join '.$this->organizationName.' on Mekong')
            ->line('You have been invited to join '.$this->organizationName.'.')
            ->line('Sign in or create an account using this email address. This invitation expires in 7 days.')
            ->action('Accept invitation', config('platform.frontend_url').'/invitations/accept?token='.$this->token);
    }
}
